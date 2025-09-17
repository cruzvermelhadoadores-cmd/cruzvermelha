import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { type DonorSearchData, type NewLeaderData, type UpdateLeaderData, type PasswordRecoveryData, type NewAdminData, type ExportDonorsData, type ExportDonationsData, type ExportReportData, insertDonorSchema, donorFormSchema, insertDonationSchema, donorSearchSchema, newLeaderSchema, updateLeaderSchema, loginSchema, resetPasswordSchema, passwordRecoverySchema, newAdminSchema, exportDonorsSchema, exportDonationsSchema, exportReportSchema } from "@shared/schema";
import ExcelJS from 'exceljs';
import bcrypt from "bcrypt";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { sendProvisionalPassword, sendWelcomeEmail, sendPasswordRecovery } from "./lib/email";

interface AuthenticatedRequest extends Request {
  session: {
    userId?: string;
    provinceId?: string;
    userRole?: string;
    destroy: (callback: (err?: any) => void) => void;
  } & Request["session"];
}

// Auth middleware
const requireAuth = async (req: any, res: any, next: any) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  // Ensure user still exists and populate session context if missing
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Utilizador não encontrado" });
  }

  // Update session with latest user context
  req.session.provinceId = user.provinceId;
  req.session.userRole = user.role;

  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const user = await storage.getUser(userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Acesso negado" });
  }

  // Update session context
  req.session.provinceId = user.provinceId;
  req.session.userRole = user.role;

  next();
};

// New middleware for province-based access
const requireProvinceAccess = (allowedRoles: string[] = ['admin', 'leader']) => {
  return async (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const user = await storage.getUser(userId);
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Update session context
    req.session.provinceId = user.provinceId;
    req.session.userRole = user.role;

    // For leaders, restrict to their province data only
    req.userContext = {
      userId: user.id,
      role: user.role,
      provinceId: user.provinceId
    };

    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {

  // Province routes
  app.get("/api/provinces", async (req, res) => {
    try {
      const provinces = await storage.getAllProvinces();
      res.json(provinces);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt:", { username: req.body.username, hasPassword: !!req.body.password });
      
      const { username, password, provinceId } = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("User not found:", username);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      console.log("User found:", { id: user.id, username: user.username, role: user.role });

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log("Invalid password for user:", username);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      console.log("Password valid for user:", username);

      // For leaders, validate province if provided, otherwise use their assigned province
      let sessionProvinceId = user.provinceId; // Default to user's province
      
      if (user.role === 'leader') {
        if (provinceId && provinceId !== user.provinceId) {
          console.log("Province access denied for leader:", { provided: provinceId, assigned: user.provinceId });
          return res.status(403).json({ message: "Acesso negado à província selecionada" });
        }
        sessionProvinceId = provinceId || user.provinceId;
      } else if (user.role === 'admin') {
        // Admins can select any province or default to their own
        sessionProvinceId = provinceId || user.provinceId;
      }

      // Store user session with province context
      (req.session as any).userId = user.id;
      (req.session as any).provinceId = sessionProvinceId;
      (req.session as any).userRole = user.role;

      console.log("Login successful:", { userId: user.id, sessionProvinceId });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, provinceContext: sessionProvinceId });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao terminar sessão" });
      }
      res.json({ message: "Sessão terminada" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Utilizador não encontrado" });
    }

    const { password: _, ...userWithoutPassword } = user;
    const sessionProvinceId = (req.session as any)?.provinceId || user.provinceId;
    res.json({ user: userWithoutPassword, provinceContext: sessionProvinceId });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { currentPassword, newPassword } = resetPasswordSchema.parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utilizador não encontrado" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Password atual incorreta" });
      }

      // SECURITY FIX: Hash the new password before storing
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { 
        password: hashedNewPassword,
        isProvisional: false 
      });

      res.json({ message: "Password atualizada com sucesso" });
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Password recovery routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, provinceId } = passwordRecoverySchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "Se o email existir, receberá instruções de recuperação." });
      }

      // Optional province validation for additional security
      if (provinceId && user.provinceId !== provinceId) {
        return res.json({ message: "Se o email existir, receberá instruções de recuperação." });
      }

      try {
        // Generate cryptographically secure random token (32 bytes = 64 hex chars)
        const token = randomBytes(32).toString('hex');

        // Hash the token for secure storage
        const tokenHash = createHash('sha256').update(token).digest('hex');

        // Set token to expire in 1 hour
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Clean up any existing tokens for this email
        await storage.deletePasswordResetTokensByEmail(email);

        // Also clean up expired tokens globally
        await storage.deleteExpiredPasswordResetTokens();

        // Store the hashed token with expiry
        await storage.createPasswordResetToken({
          email,
          tokenHash,
          expiresAt
        });

        // Send the plain token via email (never store plain token)
        await sendPasswordRecovery(email, user.name, token);

        res.json({ message: "Instruções de recuperação enviadas por email." });
      } catch (emailError) {
        console.error("Failed to send password recovery email:", emailError);
        res.status(500).json({ message: "Erro ao enviar email. Tente novamente mais tarde." });
      }
    } catch (error) {
      console.error("Password recovery error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Password reset with token validation (secure recovery flow)
  app.post("/api/auth/reset-password-token", async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;

      if (!email || !token || !newPassword) {
        return res.status(400).json({ message: "Dados obrigatórios em falta" });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Nova password deve ter pelo menos 6 caracteres" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Token inválido ou expirado" });
      }

      // SECURITY FIX: Hash the incoming token and validate against stored tokens
      const tokenHash = createHash('sha256').update(token).digest('hex');

      // Get the stored token for this email
      const storedToken = await storage.getPasswordResetTokenByTokenHash(tokenHash);
      if (!storedToken) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Verify token is for the correct email using constant-time comparison
      const emailMatches = timingSafeEqual(
        Buffer.from(storedToken.email, 'utf8'),
        Buffer.from(email, 'utf8')
      );

      if (!emailMatches) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Additional security checks (expiry and single-use already checked in storage query)
      if (storedToken.expiresAt < new Date()) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      if (storedToken.usedAt) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Mark token as used (single-use enforcement)
      await storage.markPasswordResetTokenAsUsed(storedToken.id);

      // Update user password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { 
        password: hashedNewPassword,
        isProvisional: false 
      });

      res.json({ message: "Password redefinida com sucesso" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(400).json({ message: "Erro ao redefinir password" });
    }
  });

  // Donor routes
  app.get("/api/donors", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = userId ? await storage.getUser(userId) : null;

      const filters = donorSearchSchema.parse(req.query);
      // Don't filter by blood type if "all" is selected
      if (filters.bloodType === "all") {
        filters.bloodType = undefined;
      }

      const donors = await storage.searchDonors(filters, userId, user?.role);
      res.json(donors);
    } catch (error) {
      res.status(400).json({ message: "Parâmetros inválidos" });
    }
  });

  app.get("/api/donors/:id", async (req, res) => {
    const donor = await storage.getDonor(req.params.id);
    if (!donor) {
      return res.status(404).json({ message: "Doador não encontrado" });
    }
    res.json(donor);
  });

  app.post("/api/donors", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilizador não encontrado" });
      }

      const donorData = donorFormSchema.parse(req.body);

      // Check if BI number already exists
      const existingDonor = await storage.getDonorByBiNumber(donorData.biNumber);
      if (existingDonor) {
        return res.status(400).json({ message: "Doador com este BI já existe" });
      }

      // Automatically set provinceId and createdBy based on authenticated user
      const donorWithContext = {
        ...donorData,
        provinceId: user.provinceId,
        createdBy: user.id,
      };

      const donor = await storage.createDonor(donorWithContext);
      res.status(201).json(donor);
    } catch (error) {
      console.error("Donor creation error:", error);
      console.error("Request body:", req.body);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.put("/api/donors/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilizador não encontrado" });
      }

      // Check if donor exists and get access permissions
      const existingDonor = await storage.getDonor(req.params.id);
      if (!existingDonor) {
        return res.status(404).json({ message: "Doador não encontrado" });
      }

      // Leaders can only edit donors they created
      if (user.role === "leader" && existingDonor.createdBy !== user.id) {
        return res.status(403).json({ message: "Só pode editar doadores que cadastrou" });
      }

      // Admins can edit donors from their province
      if (user.role === "admin" && existingDonor.provinceId !== user.provinceId) {
        return res.status(403).json({ message: "Só pode editar doadores da sua província" });
      }

      const updates = donorFormSchema.partial().parse(req.body);
      const donor = await storage.updateDonor(req.params.id, updates);

      res.json(donor);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.delete("/api/donors/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilizador não encontrado" });
      }

      // Check if donor exists and get access permissions
      const existingDonor = await storage.getDonor(req.params.id);
      if (!existingDonor) {
        return res.status(404).json({ message: "Doador não encontrado" });
      }

      // Leaders can only delete donors they created
      if (user.role === "leader" && existingDonor.createdBy !== user.id) {
        return res.status(403).json({ message: "Só pode eliminar doadores que cadastrou" });
      }

      // Admins can delete donors from their province
      if (user.role === "admin" && existingDonor.provinceId !== user.provinceId) {
        return res.status(403).json({ message: "Só pode eliminar doadores da sua província" });
      }

      const deleted = await storage.deleteDonor(req.params.id);
      res.json({ message: "Doador eliminado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Donation routes
  app.get("/api/donations/donor/:donorId", async (req, res) => {
    const donations = await storage.getDonationsByDonor(req.params.donorId);
    res.json(donations);
  });

  app.post("/api/donations", requireAuth, async (req, res) => {
    try {
      const donationData = insertDonationSchema.parse(req.body);
      const donation = await storage.createDonation(donationData);
      res.status(201).json(donation);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.get("/api/donations/recent", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const limit = parseInt(req.query.limit as string) || 10;
      const donations = await storage.getRecentDonations(limit, userId, user?.role);
      res.json(donations);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Statistics routes
  app.get("/api/stats", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const stats = await storage.getDonorStatsWithFilters(undefined, userId, user?.role);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Leader management routes (Admin only)
  app.get("/api/leaders", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const leaders = await storage.getUsers();
      const leadersWithoutPasswords = leaders.map(({ password, ...leader }) => leader);

      res.json(leadersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/leaders", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { name, email, provinceId } = newLeaderSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Utilizador com este email já existe" });
      }

      // Generate provisional password
      const provisionalPassword = Math.random().toString(36).slice(-8);

      // Create new leader
      const newLeader = await storage.createUser({
        username: email,
        email,
        password: provisionalPassword,
        name,
        role: "leader",
        provinceId,
        isProvisional: true,
      });

      // Send provisional password email
      try {
        await sendProvisionalPassword(email, name, provisionalPassword);
      } catch (emailError) {
        console.error("Failed to send provisional password email:", emailError);
        // Continue anyway as user was created
      }

      const { password: _, ...leaderWithoutPassword } = newLeader;

      // In development, include provisional password for testing
      if (process.env.NODE_ENV === "development") {
        console.log(`Created leader with provisional password: ${email} / ${provisionalPassword}`);
        res.status(201).json({ 
          ...leaderWithoutPassword, 
          _testProvisionalPassword: provisionalPassword 
        });
      } else {
        res.status(201).json(leaderWithoutPassword);
      }
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.put("/api/leaders/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const leaderId = req.params.id;
      const { name, email, provinceId } = updateLeaderSchema.parse(req.body);

      // Check if leader exists
      const existingLeader = await storage.getUser(leaderId);
      if (!existingLeader) {
        return res.status(404).json({ message: "Líder não encontrado" });
      }

      // Check if email is taken by another user
      const userWithEmail = await storage.getUserByEmail(email);
      if (userWithEmail && userWithEmail.id !== leaderId) {
        return res.status(400).json({ message: "Utilizador com este email já existe" });
      }

      // Update leader
      const updatedLeader = await storage.updateUser(leaderId, {
        name,
        email,
        username: email,
        provinceId
      });

      if (!updatedLeader) {
        return res.status(404).json({ message: "Líder não encontrado" });
      }

      const { password: _, ...leaderWithoutPassword } = updatedLeader;
      res.json(leaderWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.delete("/api/leaders/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const leaderId = req.params.id;

      // Prevent admin from deleting themselves
      if (leaderId === userId) {
        return res.status(400).json({ message: "Não pode eliminar o próprio utilizador" });
      }

      const deleted = await storage.deleteUser(leaderId);

      if (!deleted) {
        return res.status(404).json({ message: "Líder não encontrado" });
      }

      res.json({ message: "Líder eliminado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // User management routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin token cleanup endpoint 
  app.post("/api/admin/cleanup-tokens", requireAdmin, async (req, res) => {
    try {
      const deletedCount = await storage.deleteExpiredPasswordResetTokens();
      res.json({ 
        message: `${deletedCount} tokens expirados foram removidos`,
        deletedCount 
      });
    } catch (error) {
      console.error("Token cleanup error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Debug endpoint to check system status (development only)
  app.get("/api/debug/system-status", async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      const userCount = await storage.getUsers();
      const provinceCount = await storage.getAllProvinces();
      
      res.json({
        users: userCount.length,
        provinces: provinceCount.length,
        hasAdmin: userCount.some(u => u.role === 'admin'),
        adminUsers: userCount.filter(u => u.role === 'admin').map(u => ({
          username: u.username,
          email: u.email,
          province: u.provinceId,
          hasPassword: !!u.password,
          passwordLength: u.password?.length
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking system status" });
    }
  });

  // Debug endpoint to test credentials (development only)
  app.post("/api/debug/test-credentials", async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.json({ 
          found: false,
          message: "User not found" 
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      
      res.json({
        found: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          provinceId: user.provinceId
        },
        passwordValid: isValidPassword,
        providedPassword: password,
        storedPasswordHash: user.password.substring(0, 20) + "...",
        hashLength: user.password.length
      });
    } catch (error) {
      console.error("Debug credentials test error:", error);
      res.status(500).json({ message: "Error testing credentials" });
    }
  });

  // Hidden admin registration route (for emergency access)
  app.post("/api/admin/register-emergency", async (req, res) => {
    try {
      // Check if this is development environment or if emergency key is provided
      const { emergencyKey, name, email, username, provinceId, password } = req.body;

      // In production, require emergency key
      if (process.env.NODE_ENV === 'production' && emergencyKey !== process.env.EMERGENCY_ADMIN_KEY) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Validate required fields
      if (!name || !email || !username || !provinceId || !password) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      // Check if user already exists
      const existingByEmail = await storage.getUserByEmail(email);
      const existingByUsername = await storage.getUserByUsername(username);

      if (existingByEmail || existingByUsername) {
        return res.status(400).json({ message: "Utilizador já existe com este email ou username" });
      }

      // Check admin limit for province
      const adminCount = await storage.getAdminCountByProvince(provinceId);
      if (adminCount >= 5) {
        return res.status(400).json({ message: "Limite máximo de 5 administradores por província atingido" });
      }

      // Create new admin
      const newAdmin = await storage.createUser({
        username,
        email,
        password, // Will be hashed in storage
        name,
        role: "admin",
        provinceId,
        isProvisional: false, // Emergency admin doesn't need to reset password
      });

      const { password: _, ...adminWithoutPassword } = newAdmin;

      // Log the creation for security audit
      console.log(`Emergency admin created: ${email} for province: ${provinceId} at ${new Date().toISOString()}`);

      res.status(201).json({ 
        message: "Administrador de emergência criado com sucesso",
        admin: adminWithoutPassword 
      });
    } catch (error) {
      console.error("Emergency admin creation error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Export utility functions
  function generateCSV(headers: string[], rows: string[][]): string {
    const csvHeaders = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const csvRows = rows.map(row => 
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    );
    return '\uFEFF' + csvHeaders + '\n' + csvRows.join('\n');
  }

  async function generateExcel(worksheets: Array<{
    name: string;
    headers: string[];
    rows: string[][];
  }>): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    for (const ws of worksheets) {
      const worksheet = workbook.addWorksheet(ws.name);

      // Add headers
      worksheet.addRow(ws.headers);
      worksheet.getRow(1).font = { bold: true };

      // Add rows
      for (const row of ws.rows) {
        worksheet.addRow(row);
      }

      // Auto-fit columns
      worksheet.columns.forEach((column, index) => {
        const header = ws.headers[index];
        column.width = Math.max(header.length, 15);
      });
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  // Export routes
  app.get("/api/export/donors", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const { query, bloodType, format } = exportDonorsSchema.parse(req.query);

      const filters = { query, bloodType };
      const donors = await storage.searchDonors(filters, userId, user?.role);

      const headers = [
        'Número do BI', 'Nome Completo', 'Data de Nascimento', 'Idade', 'Gênero',
        'Município', 'Bairro', 'Contato', 'Cargo', 'Departamento', 'Tipo Sanguíneo',
        'Fator RH', 'Tem Histórico', 'Doações Anteriores', 'Última Doação',
        'Restrições Médicas', 'Apto para Doar', 'Disponível para Futuro',
        'Contato Preferido', 'Observações'
      ];

      const rows = donors.map(donor => [
        donor.biNumber,
        donor.fullName,
        donor.birthDate,
        donor.age.toString(),
        donor.gender === 'M' ? 'Masculino' : 'Feminino',
        donor.municipality,
        donor.neighborhood,
        donor.contact,
        donor.position,
        donor.department,
        donor.bloodType,
        donor.rhFactor === 'positive' ? 'Positivo' : 'Negativo',
        donor.hasHistory ? 'Sim' : 'Não',
        donor.previousDonations.toString(),
        donor.lastDonation,
        donor.medicalRestrictions,
        donor.isAptToDonate ? 'Sim' : 'Não',
        donor.availableForFuture ? 'Sim' : 'Não',
        donor.preferredContact,
        donor.observations
      ]);

      const filename = `doadores_${new Date().toISOString().split('T')[0]}`;

      if (format === 'xlsx') {
        const buffer = await generateExcel([{ name: 'Doadores', headers, rows }]);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else {
        const csv = generateCSV(headers, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error('Export donors error:', error);
      res.status(400).json({ message: "Parâmetros inválidos" });
    }
  });

  app.get("/api/export/donations", requireAuth, async (req, res) => {
    try {
      const { donorId, dateFrom, dateTo, format } = exportDonationsSchema.parse(req.query);

      const donations = await storage.getDonationsWithFilters({ donorId, dateFrom, dateTo });

      const headers = [
        'ID da Doação', 'Número do BI', 'Nome do Doador', 'Tipo Sanguíneo',
        'Data da Doação', 'Hora da Doação', 'Observações'
      ];

      const rows = donations.map(donation => [
        donation.id,
        donation.donorBiNumber,
        donation.donorName,
        donation.bloodType,
        donation.donationDate,
        donation.donationTime,
        donation.notes
      ]);

      const filename = `doacoes_${new Date().toISOString().split('T')[0]}`;

      if (format === 'xlsx') {
        const buffer = await generateExcel([{ name: 'Doações', headers, rows }]);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else {
        const csv = generateCSV(headers, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error('Export donations error:', error);
      res.status(400).json({ message: "Parâmetros inválidos" });
    }
  });

  app.get("/api/export/reports", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilizador não encontrado" });
      }

      const { type, format } = exportReportSchema.parse(req.query);

      const stats = await storage.getDonorStatsWithFilters(undefined, userId, user.role);

      let worksheets: Array<{
        name: string;
        headers: string[];
        rows: string[][];
      }> = [];

      if (type === 'overview') {
        const overviewHeaders = ['Métrica', 'Valor'];
        const overviewRows = [
          ['Total de Doadores', stats.totalDonors.toString()],
          ['Total de Doações', stats.totalDonations.toString()],
          ['Doadores Ativos', stats.activeDonors.toString()],
          ['Novos Este Mês', stats.newThisMonth.toString()]
        ];

        const bloodTypeHeaders = ['Tipo Sanguíneo', 'Quantidade', 'Percentual'];
        const bloodTypeRows = Object.entries(stats.bloodTypeStats).map(([type, stat]) => [
          type,
          stat.count.toString(),
          `${stat.percentage}%`
        ]);

        worksheets = [
          { name: 'Visão Geral', headers: overviewHeaders, rows: overviewRows },
          { name: 'Por Tipo Sanguíneo', headers: bloodTypeHeaders, rows: bloodTypeRows }
        ];
      }

      const filename = `relatorio_${type}_${new Date().toISOString().split('T')[0]}`;

      if (format === 'xlsx') {
        const buffer = await generateExcel(worksheets);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else {
        // For CSV, combine all data into one sheet
        const allHeaders = ['Tipo', 'Item', 'Valor'];
        const allRows = [
          ...worksheets[0].rows.map(row => ['Geral', row[0], row[1]]),
          ...worksheets[1].rows.map(row => ['Tipo Sanguíneo', row[0], `${row[1]} (${row[2]})`])
        ];

        const csv = generateCSV(allHeaders, allRows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error('Export reports error:', error);
      res.status(400).json({ message: "Parâmetros inválidos" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}