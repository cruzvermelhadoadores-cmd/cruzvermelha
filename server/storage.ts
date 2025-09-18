import { type Province, type InsertProvince, type User, type InsertUser, type Donor, type InsertDonor, type Donation, type InsertDonation, type PasswordResetToken, type InsertPasswordResetToken, type DonorSearchData } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import mongoose, { Schema, Document } from "mongoose";

export interface IStorage {
  // Province methods
  getProvince(id: string): Promise<Province | undefined>;
  getProvinceByName(name: string): Promise<Province | undefined>;
  createProvince(province: InsertProvince): Promise<Province>;
  updateProvince(id: string, updates: Partial<Province>): Promise<Province | undefined>;
  deleteProvince(id: string): Promise<boolean>;
  getAllProvinces(): Promise<Province[]>;
  
  // Enhanced statistics
  getDonorStatsWithFilters(provinceId?: string, userId?: string, userRole?: string): Promise<{
    totalDonors: number;
    totalDonations: number;
    activeDonors: number;
    newThisMonth: number;
    bloodTypeStats: Record<string, { count: number; percentage: number }>;
  }>;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsersByProvince(provinceId: string): Promise<User[]>;
  getAdminCountByProvince(provinceId: string): Promise<number>;

  // Donor methods
  getDonor(id: string): Promise<Donor | undefined>;
  getDonorByBiNumber(biNumber: string): Promise<Donor | undefined>;
  createDonor(donor: InsertDonor): Promise<Donor>;
  updateDonor(id: string, updates: Partial<Donor>): Promise<Donor | undefined>;
  deleteDonor(id: string): Promise<boolean>;
  searchDonors(filters: DonorSearchData, userId?: string, userRole?: string): Promise<Donor[]>;
  getAllDonors(): Promise<Donor[]>;
  getDonorsByCreator(createdBy: string): Promise<Donor[]>;
  getDonorsByProvince(provinceId: string): Promise<Donor[]>;

  // Donation methods
  getDonation(id: string): Promise<Donation | undefined>;
  getDonationsByDonor(donorId: string): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  getRecentDonations(limit: number, userId?: string, userRole?: string): Promise<(Donation & { donorName: string; bloodType: string })[]>;

  // Statistics
  getDonorStats(): Promise<{
    totalDonors: number;
    totalDonations: number;
    activeDonors: number;
    newThisMonth: number;
    bloodTypeStats: Record<string, { count: number; percentage: number }>;
  }>;

  // Export methods
  getDonationsWithFilters(filters: {
    donorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, userId?: string, userRole?: string): Promise<(Donation & { donorName: string; donorBiNumber: string; bloodType: string })[]>;
  
  getAllDonationsFlat(userId?: string, userRole?: string): Promise<(Donation & { donorName: string; donorBiNumber: string; bloodType: string })[]>;

  // Password reset token methods
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetTokenByEmail(email: string): Promise<PasswordResetToken | undefined>;
  getPasswordResetTokenByTokenHash(tokenHash: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(id: string): Promise<boolean>;
  deleteExpiredPasswordResetTokens(): Promise<number>;
  deletePasswordResetTokensByEmail(email: string): Promise<number>;
}

// MongoDB Document interfaces
interface ProvinceDocument extends Document {
  id: string;
  name: string;
  createdAt: Date;
}

interface UserDocument extends Document {
  id: string;
  username: string;
  email: string;
  password: string;
  name: string;
  role: string;
  provinceId: string;
  isProvisional: boolean;
  createdAt: Date;
}

interface DonorDocument extends Document {
  id: string;
  biNumber: string;
  fullName: string;
  birthDate: string;
  age: number;
  gender: string;
  municipality: string;
  neighborhood: string;
  contact: string;
  position: string;
  department: string;
  bloodType: string;
  rhFactor: string;
  hasHistory: boolean;
  previousDonations: number;
  lastDonation: string;
  medicalRestrictions: string;
  isAptToDonate: boolean;
  availableForFuture: boolean;
  preferredContact: string;
  observations: string;
  provinceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DonationDocument extends Document {
  id: string;
  donorId: string;
  donationDate: string;
  donationTime: string;
  notes: string;
  createdAt: Date;
}

interface PasswordResetTokenDocument extends Document {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

// MongoDB Schemas
const provinceSchema = new Schema<ProvinceDocument>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new Schema<UserDocument>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, default: "leader" },
  provinceId: { type: String, required: true },
  isProvisional: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const donorSchema = new Schema<DonorDocument>({
  id: { type: String, required: true, unique: true },
  biNumber: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  birthDate: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  municipality: { type: String, required: true },
  neighborhood: { type: String, default: "" },
  contact: { type: String, default: "" },
  position: { type: String, default: "" },
  department: { type: String, default: "" },
  bloodType: { type: String, required: true },
  rhFactor: { type: String, required: true },
  hasHistory: { type: Boolean, default: false },
  previousDonations: { type: Number, default: 0 },
  lastDonation: { type: String, default: "" },
  medicalRestrictions: { type: String, default: "" },
  isAptToDonate: { type: Boolean, default: true },
  availableForFuture: { type: Boolean, default: true },
  preferredContact: { type: String, default: "call" },
  observations: { type: String, default: "" },
  provinceId: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const donationSchema = new Schema<DonationDocument>({
  id: { type: String, required: true, unique: true },
  donorId: { type: String, required: true },
  donationDate: { type: String, required: true },
  donationTime: { type: String, required: true },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const passwordResetTokenSchema = new Schema<PasswordResetTokenDocument>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient cleanup of expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 });
// Index for efficient email lookups
passwordResetTokenSchema.index({ email: 1 });

// Create models
const ProvinceModel = mongoose.model<ProvinceDocument>("Province", provinceSchema);
const UserModel = mongoose.model<UserDocument>("User", userSchema);
const DonorModel = mongoose.model<DonorDocument>("Donor", donorSchema);
const DonationModel = mongoose.model<DonationDocument>("Donation", donationSchema);
const PasswordResetTokenModel = mongoose.model<PasswordResetTokenDocument>("PasswordResetToken", passwordResetTokenSchema);

export class MongoStorage implements IStorage {
  private connected: boolean = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      const mongoUrl = process.env.MONGODB_URL;
      console.log(`==== DADOS DO SERVER === "KKKK"`)
      if (!mongoUrl) {
        throw new Error("MONGODB_URL environment variable is not set");
      }

      await mongoose.connect(mongoUrl);
      this.connected = true;
      console.log("Connected to MongoDB successfully");

      // Create default provinces and admin user if they don't exist
      await this.initializeProvinces();
      await this.initializeDefaultAdmin();
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  private async initializeProvinces() {
    try {
      const existingProvinces = await ProvinceModel.countDocuments();
      if (existingProvinces === 0) {
        const angolasProvinces = [
          "Luanda", "Bengo", "Benguela", "Bié", "Cabinda", "Cunene", "Huambo", 
          "Huíla", "Kuando Kubango", "Kwanza Norte", "Kwanza Sul", 
          "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"
        ];
        
        for (const provinceName of angolasProvinces) {
          const province = new ProvinceModel({
            id: randomUUID(),
            name: provinceName,
            createdAt: new Date(),
          });
          await province.save();
        }
        console.log("Default provinces created");
      }
    } catch (error) {
      console.error("Error creating provinces:", error);
    }
  }

  private async initializeDefaultAdmin() {
    try {
      const existingAdmin = await UserModel.findOne({ username: "admin" });
      
      // Get the first province (Luanda) for the default admin
      const luandaProvince = await ProvinceModel.findOne({ name: "Luanda" });
      if (!luandaProvince) {
        console.error("Cannot create default admin: Luanda province not found");
        return;
      }
      
      // Use environment variable or default password for development
      const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123";
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      if (!existingAdmin) {
        console.log(`==== DADOS DO SERVER === "KKKK"`)
        console.log(`\n*** CREATING DEFAULT ADMIN ***`);
        console.log(`Username: admin`);
        console.log(`Password: ${adminPassword}`);
        console.log(`Email: admin@cruzvermelha.ao`);
        console.log(`Province: ${luandaProvince.name} (${luandaProvince.id})`);
        console.log(`Hashed password length: ${hashedPassword.length}`);
        console.log("*** Please change this password after first login ***\n");
        
        const admin = new UserModel({
          id: randomUUID(),
          username: "admin",
          email: "admin@cruzvermelha.ao",
          password: hashedPassword,
          name: "Administrador",
          role: "admin",
          provinceId: luandaProvince.id,
          isProvisional: false,
          createdAt: new Date(),
        });
        await admin.save();
        console.log("Default admin user created successfully with ID:", admin.id);
        
        // Verify the admin was created correctly
        const verifyAdmin = await UserModel.findOne({ username: "admin" });
        if (verifyAdmin) {
          console.log("Admin verification successful:", {
            id: verifyAdmin.id,
            username: verifyAdmin.username,
            email: verifyAdmin.email,
            role: verifyAdmin.role,
            provinceId: verifyAdmin.provinceId,
            hasPassword: !!verifyAdmin.password,
            passwordLength: verifyAdmin.password?.length
          });
        }
      } else {
        // Check if password needs to be reset (for development)
        const isValidPassword = await bcrypt.compare(adminPassword, existingAdmin.password);
        if (!isValidPassword && process.env.NODE_ENV === 'development') {
          console.log("*** RESETTING ADMIN PASSWORD FOR DEVELOPMENT ***");
          console.log(`New Password: ${adminPassword}`);
          
          // Update the admin password
          await UserModel.updateOne(
            { username: "admin" },
            { password: hashedPassword }
          );
          
          console.log("Admin password reset successfully");
        }
        
        console.log("Default admin already exists:", {
          id: existingAdmin.id,
          username: existingAdmin.username,
          email: existingAdmin.email,
          role: existingAdmin.role,
          provinceId: existingAdmin.provinceId,
          hasPassword: !!existingAdmin.password,
          passwordLength: existingAdmin.password?.length
        });
      }
    } catch (error) {
      console.error("Error creating default admin:", error);
    }
  }

  // Helper function to generate random password
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Helper function to convert Mongoose document to plain object
  private toPlainObject<T>(doc: Document | null): T | undefined {
    if (!doc) return undefined;
    const obj = doc.toObject();
    delete obj._id;
    delete obj.__v;
    return obj as T;
  }

  // Province methods
  async getProvince(id: string): Promise<Province | undefined> {
    const province = await ProvinceModel.findOne({ id });
    return this.toPlainObject<Province>(province);
  }

  async getProvinceByName(name: string): Promise<Province | undefined> {
    const province = await ProvinceModel.findOne({ name });
    return this.toPlainObject<Province>(province);
  }

  async createProvince(insertProvince: InsertProvince): Promise<Province> {
    const id = randomUUID();
    const province = new ProvinceModel({
      ...insertProvince,
      id,
      createdAt: new Date(),
    });

    await province.save();
    return this.toPlainObject<Province>(province)!;
  }

  async updateProvince(id: string, updates: Partial<Province>): Promise<Province | undefined> {
    const updated = await ProvinceModel.findOneAndUpdate({ id }, updates, { new: true });
    return this.toPlainObject<Province>(updated);
  }

  async deleteProvince(id: string): Promise<boolean> {
    const result = await ProvinceModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getAllProvinces(): Promise<Province[]> {
    const provinces = await ProvinceModel.find();
    return provinces.map(province => this.toPlainObject<Province>(province)!);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ id });
    return this.toPlainObject<User>(user);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username });
    return this.toPlainObject<User>(user);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email });
    return this.toPlainObject<User>(user);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    // Check admin limit if role is being changed to admin or province is being changed for an admin
    if (updates.role === "admin" || updates.provinceId) {
      const currentUser = await this.getUser(id);
      if (!currentUser) return undefined;
      
      const finalRole = updates.role || currentUser.role;
      const finalProvinceId = updates.provinceId || currentUser.provinceId;
      
      if (finalRole === "admin") {
        const adminCount = await this.getAdminCountByProvince(finalProvinceId);
        // Subtract 1 if current user is already an admin in this province
        const currentAdminInProvince = currentUser.role === "admin" && currentUser.provinceId === finalProvinceId;
        const effectiveCount = currentAdminInProvince ? adminCount - 1 : adminCount;
        
        if (effectiveCount >= 5) {
          throw new Error("Limite máximo de 5 administradores por província atingido");
        }
      }
    }
    
    const updated = await UserModel.findOneAndUpdate({ id }, updates, { new: true });
    return this.toPlainObject<User>(updated);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await UserModel.deleteOne({ id: userId });
    return result.deletedCount > 0;
  }

  async getUsers(): Promise<User[]> {
    const users = await UserModel.find().sort({ createdAt: -1 });
    return users.map(user => this.toPlainObject<User>(user)!);
  }

  async getUsersByProvince(provinceId: string): Promise<User[]> {
    const users = await UserModel.find({ provinceId });
    return users.map(user => this.toPlainObject<User>(user)!);
  }

  async getAdminCountByProvince(provinceId: string): Promise<number> {
    return await UserModel.countDocuments({ provinceId, role: "admin" });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Check admin limit for the province
    if (insertUser.role === "admin") {
      const adminCount = await this.getAdminCountByProvince(insertUser.provinceId);
      if (adminCount >= 5) {
        throw new Error("Limite máximo de 5 administradores por província atingido");
      }
    }

    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);

    const user = new UserModel({
      ...insertUser,
      id,
      password: hashedPassword,
      role: insertUser.role || "leader",
      isProvisional: insertUser.isProvisional ?? true,
      createdAt: new Date(),
    });

    await user.save();
    return this.toPlainObject<User>(user)!;
  }

  // Donor methods
  async getDonor(id: string): Promise<Donor | undefined> {
    const donor = await DonorModel.findOne({ id });
    return this.toPlainObject<Donor>(donor);
  }

  async getDonorByBiNumber(biNumber: string): Promise<Donor | undefined> {
    const donor = await DonorModel.findOne({ biNumber });
    return this.toPlainObject<Donor>(donor);
  }

  async createDonor(insertDonor: InsertDonor): Promise<Donor> {
    const id = randomUUID();
    const donor = new DonorModel({
      ...insertDonor,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await donor.save();
    return this.toPlainObject<Donor>(donor)!;
  }

  async updateDonor(id: string, updates: Partial<Donor>): Promise<Donor | undefined> {
    const updatedDonor = await DonorModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return this.toPlainObject<Donor>(updatedDonor);
  }

  async deleteDonor(id: string): Promise<boolean> {
    const result = await DonorModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getDonorsByCreator(createdBy: string): Promise<Donor[]> {
    const donors = await DonorModel.find({ createdBy });
    return donors.map(donor => this.toPlainObject<Donor>(donor)!);
  }

  async getDonorsByProvince(provinceId: string): Promise<Donor[]> {
    const donors = await DonorModel.find({ provinceId });
    return donors.map(donor => this.toPlainObject<Donor>(donor)!);
  }

  async searchDonors(filters: DonorSearchData, userId?: string, userRole?: string): Promise<Donor[]> {
    const filter: any = {};

    // Apply role-based filtering
    if (userRole === "leader" && userId) {
      // Leaders can only see donors they created
      filter.createdBy = userId;
    } else if (userRole === "admin" && filters.provinceId) {
      // Admins can filter by specific province or see all if no province filter
      filter.provinceId = filters.provinceId;
    }

    // Apply search filters
    if (filters.query) {
      const searchRegex = new RegExp(filters.query, 'i');
      filter.$or = [
        { fullName: searchRegex },
        { biNumber: searchRegex },
        { contact: searchRegex },
        { position: searchRegex }
      ];
    }

    if (filters.bloodType) {
      filter.bloodType = filters.bloodType;
    }

    if (filters.gender) {
      filter.gender = filters.gender;
    }

    if (filters.municipality) {
      filter.municipality = new RegExp(filters.municipality, 'i');
    }

    if (filters.department) {
      filter.department = filters.department;
    }

    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      filter.age = {};
      if (filters.ageMin !== undefined) filter.age.$gte = filters.ageMin;
      if (filters.ageMax !== undefined) filter.age.$lte = filters.ageMax;
    }

    if (filters.isAptToDonate !== undefined) {
      filter.isAptToDonate = filters.isAptToDonate;
    }

    if (filters.availableForFuture !== undefined) {
      filter.availableForFuture = filters.availableForFuture;
    }

    if (filters.hasHistory !== undefined) {
      filter.hasHistory = filters.hasHistory;
    }

    // Date range filters
    if (filters.createdDateFrom || filters.createdDateTo) {
      filter.createdAt = {};
      if (filters.createdDateFrom) {
        filter.createdAt.$gte = new Date(filters.createdDateFrom);
      }
      if (filters.createdDateTo) {
        const endDate = new Date(filters.createdDateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = endDate;
      }
    }

    if (filters.lastDonationFrom || filters.lastDonationTo) {
      filter.lastDonation = {};
      if (filters.lastDonationFrom) {
        filter.lastDonation.$gte = filters.lastDonationFrom;
      }
      if (filters.lastDonationTo) {
        filter.lastDonation.$lte = filters.lastDonationTo;
      }
    }

    // Sorting
    let sortOptions: any = { createdAt: -1 }; // Default sort by creation date, newest first
    
    if (filters.sortBy) {
      const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
      
      switch (filters.sortBy) {
        case "name":
          sortOptions = { fullName: sortOrder };
          break;
        case "age":
          sortOptions = { age: sortOrder };
          break;
        case "bloodType":
          sortOptions = { bloodType: sortOrder };
          break;
        case "createdAt":
          sortOptions = { createdAt: sortOrder };
          break;
        case "lastDonation":
          sortOptions = { lastDonation: sortOrder };
          break;
      }
    }

    const donors = await DonorModel.find(filter).sort(sortOptions);
    return donors.map(donor => this.toPlainObject<Donor>(donor)!);
  }

  async getAllDonors(): Promise<Donor[]> {
    const donors = await DonorModel.find();
    return donors.map(donor => this.toPlainObject<Donor>(donor)!);
  }

  // Donation methods
  async getDonation(id: string): Promise<Donation | undefined> {
    const donation = await DonationModel.findOne({ id });
    return this.toPlainObject<Donation>(donation);
  }

  async getDonationsByDonor(donorId: string): Promise<Donation[]> {
    const donations = await DonationModel.find({ donorId });
    return donations.map(donation => this.toPlainObject<Donation>(donation)!);
  }

  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const id = randomUUID();
    const donation = new DonationModel({
      ...insertDonation,
      id,
      createdAt: new Date(),
    });

    await donation.save();
    return this.toPlainObject<Donation>(donation)!;
  }

  async getRecentDonations(limit: number, userId?: string, userRole?: string): Promise<(Donation & { donorName: string; bloodType: string })[]> {
    const donations = await DonationModel.find()
      .sort({ createdAt: -1 })
      .limit(limit * 2); // Get more to account for filtering

    const result = [];
    let userProvince: string | undefined;
    
    // Get user's province for leader filtering
    if (userRole === "leader" && userId) {
      const user = await this.getUser(userId);
      userProvince = user?.provinceId;
    }
    
    for (const donation of donations) {
      const donor = await DonorModel.findOne({ id: donation.donorId });
      if (!donor) continue;
      
      // Apply role-based filtering
      if (userRole === "leader" && userProvince && donor.provinceId !== userProvince) {
        continue;
      }
      
      result.push({
        ...this.toPlainObject<Donation>(donation)!,
        donorName: donor.fullName || "Doador Desconhecido",
        bloodType: donor.bloodType || "N/A",
      });
      
      // Stop when we have enough results
      if (result.length >= limit) break;
    }

    return result;
  }

  // Statistics - DEPRECATED: Use getDonorStatsWithFilters for proper access control
  async getDonorStats(): Promise<{
    totalDonors: number;
    totalDonations: number;
    activeDonors: number;
    newThisMonth: number;
    bloodTypeStats: Record<string, { count: number; percentage: number }>;
  }> {
    // This method should not be used directly - it returns global stats without access control
    throw new Error("Use getDonorStatsWithFilters with user context for proper access control");
  }

  async getDonorStatsWithFilters(provinceId?: string, userId?: string, userRole?: string): Promise<{
    totalDonors: number;
    totalDonations: number;
    activeDonors: number;
    newThisMonth: number;
    bloodTypeStats: Record<string, { count: number; percentage: number }>;
  }> {
    // Apply role-based filtering
    const donorFilter: any = {};
    if (userRole === "leader" && userId) {
      // Leaders see province-based data
      const user = await this.getUser(userId);
      if (user) {
        donorFilter.provinceId = user.provinceId;
      }
    } else if (provinceId) {
      donorFilter.provinceId = provinceId;
    }

    const totalDonors = await DonorModel.countDocuments(donorFilter);
    
    // For donations, we need to find donations from filtered donors
    let totalDonations = 0;
    if (Object.keys(donorFilter).length > 0) {
      const filteredDonors = await DonorModel.find(donorFilter, { id: 1 });
      const donorIds = filteredDonors.map(d => d.id);
      totalDonations = await DonationModel.countDocuments({ donorId: { $in: donorIds } });
    } else {
      totalDonations = await DonationModel.countDocuments();
    }
    
    const activeDonors = await DonorModel.countDocuments({ ...donorFilter, isAptToDonate: true });

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const newThisMonth = await DonorModel.countDocuments({
      ...donorFilter,
      createdAt: { $gte: startOfMonth }
    });

    const bloodTypeStats: Record<string, { count: number; percentage: number }> = {};
    const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

    for (const type of bloodTypes) {
      const count = await DonorModel.countDocuments({ ...donorFilter, bloodType: type });
      const percentage = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
      bloodTypeStats[type] = { count, percentage };
    }

    return {
      totalDonors,
      totalDonations,
      activeDonors,
      newThisMonth,
      bloodTypeStats,
    };
  }

  // Export methods
  async getDonationsWithFilters(filters: {
    donorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, userId?: string, userRole?: string): Promise<(Donation & { donorName: string; donorBiNumber: string; bloodType: string })[]> {
    const query: any = {};

    if (filters.donorId) {
      query.donorId = filters.donorId;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.donationDate = {};
      if (filters.dateFrom) {
        query.donationDate.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.donationDate.$lte = filters.dateTo;
      }
    }

    let donations = await DonationModel.find(query).sort({ donationDate: -1 });

    // Apply role-based filtering
    if (userRole === "leader" && userId) {
      const user = await this.getUser(userId);
      if (user) {
        // Filter donations to only include those from donors in the leader's province
        const provinceDonors = await DonorModel.find({ provinceId: user.provinceId }, { id: 1 });
        const provinceDonorIds = provinceDonors.map(d => d.id);
        donations = donations.filter(d => provinceDonorIds.includes(d.donorId));
      }
    }

    const result = [];
    for (const donation of donations) {
      const donor = await DonorModel.findOne({ id: donation.donorId });
      result.push({
        ...this.toPlainObject<Donation>(donation)!,
        donorName: donor?.fullName || "Doador Desconhecido",
        donorBiNumber: donor?.biNumber || "N/A",
        bloodType: donor?.bloodType || "N/A",
      });
    }

    return result;
  }

  async getAllDonationsFlat(userId?: string, userRole?: string): Promise<(Donation & { donorName: string; donorBiNumber: string; bloodType: string })[]> {
    return this.getDonationsWithFilters({}, userId, userRole);
  }

  // Password reset token methods
  async createPasswordResetToken(insertToken: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const id = randomUUID();
    const token = new PasswordResetTokenModel({
      ...insertToken,
      id,
      createdAt: new Date(),
    });

    await token.save();
    return this.toPlainObject<PasswordResetToken>(token)!;
  }

  async getPasswordResetTokenByEmail(email: string): Promise<PasswordResetToken | undefined> {
    // Get the most recent unused token for this email
    const token = await PasswordResetTokenModel.findOne({ 
      email, 
      usedAt: { $exists: false },
      expiresAt: { $gte: new Date() } 
    }).sort({ createdAt: -1 });
    return this.toPlainObject<PasswordResetToken>(token);
  }

  async getPasswordResetTokenByTokenHash(tokenHash: string): Promise<PasswordResetToken | undefined> {
    const token = await PasswordResetTokenModel.findOne({ 
      tokenHash,
      usedAt: { $exists: false },
      expiresAt: { $gte: new Date() }
    });
    return this.toPlainObject<PasswordResetToken>(token);
  }

  async markPasswordResetTokenAsUsed(id: string): Promise<boolean> {
    const result = await PasswordResetTokenModel.updateOne(
      { id },
      { usedAt: new Date() }
    );
    return result.modifiedCount > 0;
  }

  async deleteExpiredPasswordResetTokens(): Promise<number> {
    const result = await PasswordResetTokenModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount || 0;
  }

  async deletePasswordResetTokensByEmail(email: string): Promise<number> {
    const result = await PasswordResetTokenModel.deleteMany({ email });
    return result.deletedCount || 0;
  }
}

export const storage = new MongoStorage();