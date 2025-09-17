// server/index.ts
import express2 from "express";
import session from "express-session";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
var provinceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
var userSchema = new Schema({
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
var donorSchema = new Schema({
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
var donationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  donorId: { type: String, required: true },
  donationDate: { type: String, required: true },
  donationTime: { type: String, required: true },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});
var passwordResetTokenSchema = new Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
passwordResetTokenSchema.index({ expiresAt: 1 });
passwordResetTokenSchema.index({ email: 1 });
var ProvinceModel = mongoose.model("Province", provinceSchema);
var UserModel = mongoose.model("User", userSchema);
var DonorModel = mongoose.model("Donor", donorSchema);
var DonationModel = mongoose.model("Donation", donationSchema);
var PasswordResetTokenModel = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
var MongoStorage = class {
  connected = false;
  constructor() {
    this.connect();
  }
  async connect() {
    try {
      const mongoUrl = process.env.MONGODB_URL;
      if (!mongoUrl) {
        throw new Error("MONGODB_URL environment variable is not set");
      }
      await mongoose.connect(mongoUrl);
      this.connected = true;
      console.log("Connected to MongoDB successfully");
      await this.initializeProvinces();
      await this.initializeDefaultAdmin();
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }
  async initializeProvinces() {
    try {
      const existingProvinces = await ProvinceModel.countDocuments();
      if (existingProvinces === 0) {
        const angolasProvinces = [
          "Luanda",
          "Bengo",
          "Benguela",
          "Bi\xE9",
          "Cabinda",
          "Cunene",
          "Huambo",
          "Hu\xEDla",
          "Kuando Kubango",
          "Kwanza Norte",
          "Kwanza Sul",
          "Lunda Norte",
          "Lunda Sul",
          "Malanje",
          "Moxico",
          "Namibe",
          "U\xEDge",
          "Zaire"
        ];
        for (const provinceName of angolasProvinces) {
          const province = new ProvinceModel({
            id: randomUUID(),
            name: provinceName,
            createdAt: /* @__PURE__ */ new Date()
          });
          await province.save();
        }
        console.log("Default provinces created");
      }
    } catch (error) {
      console.error("Error creating provinces:", error);
    }
  }
  async initializeDefaultAdmin() {
    try {
      const existingAdmin = await UserModel.findOne({ username: "admin" });
      const luandaProvince = await ProvinceModel.findOne({ name: "Luanda" });
      if (!luandaProvince) {
        console.error("Cannot create default admin: Luanda province not found");
        return;
      }
      const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123";
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      if (!existingAdmin) {
        console.log(`
*** CREATING DEFAULT ADMIN ***`);
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
          createdAt: /* @__PURE__ */ new Date()
        });
        await admin.save();
        console.log("Default admin user created successfully with ID:", admin.id);
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
        const isValidPassword = await bcrypt.compare(adminPassword, existingAdmin.password);
        if (!isValidPassword && process.env.NODE_ENV === "development") {
          console.log("*** RESETTING ADMIN PASSWORD FOR DEVELOPMENT ***");
          console.log(`New Password: ${adminPassword}`);
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
  generateRandomPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  // Helper function to convert Mongoose document to plain object
  toPlainObject(doc) {
    if (!doc) return void 0;
    const obj = doc.toObject();
    delete obj._id;
    delete obj.__v;
    return obj;
  }
  // Province methods
  async getProvince(id) {
    const province = await ProvinceModel.findOne({ id });
    return this.toPlainObject(province);
  }
  async getProvinceByName(name) {
    const province = await ProvinceModel.findOne({ name });
    return this.toPlainObject(province);
  }
  async createProvince(insertProvince) {
    const id = randomUUID();
    const province = new ProvinceModel({
      ...insertProvince,
      id,
      createdAt: /* @__PURE__ */ new Date()
    });
    await province.save();
    return this.toPlainObject(province);
  }
  async updateProvince(id, updates) {
    const updated = await ProvinceModel.findOneAndUpdate({ id }, updates, { new: true });
    return this.toPlainObject(updated);
  }
  async deleteProvince(id) {
    const result = await ProvinceModel.deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getAllProvinces() {
    const provinces = await ProvinceModel.find();
    return provinces.map((province) => this.toPlainObject(province));
  }
  // User methods
  async getUser(id) {
    const user = await UserModel.findOne({ id });
    return this.toPlainObject(user);
  }
  async getUserByUsername(username) {
    const user = await UserModel.findOne({ username });
    return this.toPlainObject(user);
  }
  async getUserByEmail(email) {
    const user = await UserModel.findOne({ email });
    return this.toPlainObject(user);
  }
  async updateUser(id, updates) {
    if (updates.role === "admin" || updates.provinceId) {
      const currentUser = await this.getUser(id);
      if (!currentUser) return void 0;
      const finalRole = updates.role || currentUser.role;
      const finalProvinceId = updates.provinceId || currentUser.provinceId;
      if (finalRole === "admin") {
        const adminCount = await this.getAdminCountByProvince(finalProvinceId);
        const currentAdminInProvince = currentUser.role === "admin" && currentUser.provinceId === finalProvinceId;
        const effectiveCount = currentAdminInProvince ? adminCount - 1 : adminCount;
        if (effectiveCount >= 5) {
          throw new Error("Limite m\xE1ximo de 5 administradores por prov\xEDncia atingido");
        }
      }
    }
    const updated = await UserModel.findOneAndUpdate({ id }, updates, { new: true });
    return this.toPlainObject(updated);
  }
  async deleteUser(userId) {
    const result = await UserModel.deleteOne({ id: userId });
    return result.deletedCount > 0;
  }
  async getUsers() {
    const users = await UserModel.find().sort({ createdAt: -1 });
    return users.map((user) => this.toPlainObject(user));
  }
  async getUsersByProvince(provinceId) {
    const users = await UserModel.find({ provinceId });
    return users.map((user) => this.toPlainObject(user));
  }
  async getAdminCountByProvince(provinceId) {
    return await UserModel.countDocuments({ provinceId, role: "admin" });
  }
  async createUser(insertUser) {
    if (insertUser.role === "admin") {
      const adminCount = await this.getAdminCountByProvince(insertUser.provinceId);
      if (adminCount >= 5) {
        throw new Error("Limite m\xE1ximo de 5 administradores por prov\xEDncia atingido");
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
      createdAt: /* @__PURE__ */ new Date()
    });
    await user.save();
    return this.toPlainObject(user);
  }
  // Donor methods
  async getDonor(id) {
    const donor = await DonorModel.findOne({ id });
    return this.toPlainObject(donor);
  }
  async getDonorByBiNumber(biNumber) {
    const donor = await DonorModel.findOne({ biNumber });
    return this.toPlainObject(donor);
  }
  async createDonor(insertDonor) {
    const id = randomUUID();
    const donor = new DonorModel({
      ...insertDonor,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    await donor.save();
    return this.toPlainObject(donor);
  }
  async updateDonor(id, updates) {
    const updatedDonor = await DonorModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: /* @__PURE__ */ new Date() },
      { new: true }
    );
    return this.toPlainObject(updatedDonor);
  }
  async deleteDonor(id) {
    const result = await DonorModel.deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getDonorsByCreator(createdBy) {
    const donors = await DonorModel.find({ createdBy });
    return donors.map((donor) => this.toPlainObject(donor));
  }
  async getDonorsByProvince(provinceId) {
    const donors = await DonorModel.find({ provinceId });
    return donors.map((donor) => this.toPlainObject(donor));
  }
  async searchDonors(filters, userId, userRole) {
    const filter = {};
    if (userRole === "leader" && userId) {
      filter.createdBy = userId;
    } else if (userRole === "admin" && filters.provinceId) {
      filter.provinceId = filters.provinceId;
    }
    if (filters.query) {
      const searchRegex = new RegExp(filters.query, "i");
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
      filter.municipality = new RegExp(filters.municipality, "i");
    }
    if (filters.department) {
      filter.department = filters.department;
    }
    if (filters.ageMin !== void 0 || filters.ageMax !== void 0) {
      filter.age = {};
      if (filters.ageMin !== void 0) filter.age.$gte = filters.ageMin;
      if (filters.ageMax !== void 0) filter.age.$lte = filters.ageMax;
    }
    if (filters.isAptToDonate !== void 0) {
      filter.isAptToDonate = filters.isAptToDonate;
    }
    if (filters.availableForFuture !== void 0) {
      filter.availableForFuture = filters.availableForFuture;
    }
    if (filters.hasHistory !== void 0) {
      filter.hasHistory = filters.hasHistory;
    }
    if (filters.createdDateFrom || filters.createdDateTo) {
      filter.createdAt = {};
      if (filters.createdDateFrom) {
        filter.createdAt.$gte = new Date(filters.createdDateFrom);
      }
      if (filters.createdDateTo) {
        const endDate = new Date(filters.createdDateTo);
        endDate.setHours(23, 59, 59, 999);
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
    let sortOptions = { createdAt: -1 };
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
    return donors.map((donor) => this.toPlainObject(donor));
  }
  async getAllDonors() {
    const donors = await DonorModel.find();
    return donors.map((donor) => this.toPlainObject(donor));
  }
  // Donation methods
  async getDonation(id) {
    const donation = await DonationModel.findOne({ id });
    return this.toPlainObject(donation);
  }
  async getDonationsByDonor(donorId) {
    const donations = await DonationModel.find({ donorId });
    return donations.map((donation) => this.toPlainObject(donation));
  }
  async createDonation(insertDonation) {
    const id = randomUUID();
    const donation = new DonationModel({
      ...insertDonation,
      id,
      createdAt: /* @__PURE__ */ new Date()
    });
    await donation.save();
    return this.toPlainObject(donation);
  }
  async getRecentDonations(limit, userId, userRole) {
    const donations = await DonationModel.find().sort({ createdAt: -1 }).limit(limit * 2);
    const result = [];
    let userProvince;
    if (userRole === "leader" && userId) {
      const user = await this.getUser(userId);
      userProvince = user?.provinceId;
    }
    for (const donation of donations) {
      const donor = await DonorModel.findOne({ id: donation.donorId });
      if (!donor) continue;
      if (userRole === "leader" && userProvince && donor.provinceId !== userProvince) {
        continue;
      }
      result.push({
        ...this.toPlainObject(donation),
        donorName: donor.fullName || "Doador Desconhecido",
        bloodType: donor.bloodType || "N/A"
      });
      if (result.length >= limit) break;
    }
    return result;
  }
  // Statistics - DEPRECATED: Use getDonorStatsWithFilters for proper access control
  async getDonorStats() {
    throw new Error("Use getDonorStatsWithFilters with user context for proper access control");
  }
  async getDonorStatsWithFilters(provinceId, userId, userRole) {
    const donorFilter = {};
    if (userRole === "leader" && userId) {
      const user = await this.getUser(userId);
      if (user) {
        donorFilter.provinceId = user.provinceId;
      }
    } else if (provinceId) {
      donorFilter.provinceId = provinceId;
    }
    const totalDonors = await DonorModel.countDocuments(donorFilter);
    let totalDonations = 0;
    if (Object.keys(donorFilter).length > 0) {
      const filteredDonors = await DonorModel.find(donorFilter, { id: 1 });
      const donorIds = filteredDonors.map((d) => d.id);
      totalDonations = await DonationModel.countDocuments({ donorId: { $in: donorIds } });
    } else {
      totalDonations = await DonationModel.countDocuments();
    }
    const activeDonors = await DonorModel.countDocuments({ ...donorFilter, isAptToDonate: true });
    const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const newThisMonth = await DonorModel.countDocuments({
      ...donorFilter,
      createdAt: { $gte: startOfMonth }
    });
    const bloodTypeStats = {};
    const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
    for (const type of bloodTypes) {
      const count = await DonorModel.countDocuments({ ...donorFilter, bloodType: type });
      const percentage = totalDonors > 0 ? Math.round(count / totalDonors * 100) : 0;
      bloodTypeStats[type] = { count, percentage };
    }
    return {
      totalDonors,
      totalDonations,
      activeDonors,
      newThisMonth,
      bloodTypeStats
    };
  }
  // Export methods
  async getDonationsWithFilters(filters, userId, userRole) {
    const query = {};
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
    if (userRole === "leader" && userId) {
      const user = await this.getUser(userId);
      if (user) {
        const provinceDonors = await DonorModel.find({ provinceId: user.provinceId }, { id: 1 });
        const provinceDonorIds = provinceDonors.map((d) => d.id);
        donations = donations.filter((d) => provinceDonorIds.includes(d.donorId));
      }
    }
    const result = [];
    for (const donation of donations) {
      const donor = await DonorModel.findOne({ id: donation.donorId });
      result.push({
        ...this.toPlainObject(donation),
        donorName: donor?.fullName || "Doador Desconhecido",
        donorBiNumber: donor?.biNumber || "N/A",
        bloodType: donor?.bloodType || "N/A"
      });
    }
    return result;
  }
  async getAllDonationsFlat(userId, userRole) {
    return this.getDonationsWithFilters({}, userId, userRole);
  }
  // Password reset token methods
  async createPasswordResetToken(insertToken) {
    const id = randomUUID();
    const token = new PasswordResetTokenModel({
      ...insertToken,
      id,
      createdAt: /* @__PURE__ */ new Date()
    });
    await token.save();
    return this.toPlainObject(token);
  }
  async getPasswordResetTokenByEmail(email) {
    const token = await PasswordResetTokenModel.findOne({
      email,
      usedAt: { $exists: false },
      expiresAt: { $gte: /* @__PURE__ */ new Date() }
    }).sort({ createdAt: -1 });
    return this.toPlainObject(token);
  }
  async getPasswordResetTokenByTokenHash(tokenHash) {
    const token = await PasswordResetTokenModel.findOne({
      tokenHash,
      usedAt: { $exists: false },
      expiresAt: { $gte: /* @__PURE__ */ new Date() }
    });
    return this.toPlainObject(token);
  }
  async markPasswordResetTokenAsUsed(id) {
    const result = await PasswordResetTokenModel.updateOne(
      { id },
      { usedAt: /* @__PURE__ */ new Date() }
    );
    return result.modifiedCount > 0;
  }
  async deleteExpiredPasswordResetTokens() {
    const result = await PasswordResetTokenModel.deleteMany({
      expiresAt: { $lt: /* @__PURE__ */ new Date() }
    });
    return result.deletedCount || 0;
  }
  async deletePasswordResetTokensByEmail(email) {
    const result = await PasswordResetTokenModel.deleteMany({ email });
    return result.deletedCount || 0;
  }
};
var storage = new MongoStorage();

// shared/schema.ts
import { z } from "zod";
var provinceSchema2 = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome da prov\xEDncia \xE9 obrigat\xF3rio"),
  createdAt: z.date()
});
var userSchema2 = z.object({
  id: z.string(),
  username: z.string().min(1, "Username \xE9 obrigat\xF3rio"),
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(1, "Password \xE9 obrigat\xF3ria"),
  name: z.string().min(1, "Nome \xE9 obrigat\xF3rio"),
  role: z.enum(["admin", "leader"], { required_error: "Role \xE9 obrigat\xF3rio" }),
  provinceId: z.string().min(1, "Prov\xEDncia \xE9 obrigat\xF3ria"),
  isProvisional: z.boolean().default(true),
  createdAt: z.date()
});
var donorSchema2 = z.object({
  id: z.string(),
  biNumber: z.string().min(1, "N\xFAmero do BI \xE9 obrigat\xF3rio"),
  fullName: z.string().min(1, "Nome completo \xE9 obrigat\xF3rio"),
  birthDate: z.string().min(1, "Data de nascimento \xE9 obrigat\xF3ria"),
  age: z.number().min(1, "Idade deve ser maior que 0"),
  gender: z.enum(["M", "F"], { required_error: "G\xEAnero \xE9 obrigat\xF3rio" }),
  municipality: z.string().min(1, "Munic\xEDpio \xE9 obrigat\xF3rio"),
  neighborhood: z.string().default(""),
  contact: z.string().default(""),
  position: z.string().default(""),
  department: z.string().default(""),
  bloodType: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"], {
    required_error: "Tipo sangu\xEDneo \xE9 obrigat\xF3rio"
  }),
  rhFactor: z.enum(["positive", "negative"], {
    required_error: "Fator RH \xE9 obrigat\xF3rio"
  }),
  hasHistory: z.boolean().default(false),
  previousDonations: z.number().default(0),
  lastDonation: z.string().default(""),
  medicalRestrictions: z.string().default(""),
  isAptToDonate: z.boolean().default(true),
  availableForFuture: z.boolean().default(true),
  preferredContact: z.enum(["call", "sms", "email", "whatsapp"]).default("call"),
  observations: z.string().default(""),
  provinceId: z.string().min(1, "Prov\xEDncia \xE9 obrigat\xF3ria"),
  createdBy: z.string().min(1, "Criado por \xE9 obrigat\xF3rio"),
  createdAt: z.date(),
  updatedAt: z.date()
});
var donationSchema2 = z.object({
  id: z.string(),
  donorId: z.string().min(1, "ID do doador \xE9 obrigat\xF3rio"),
  donationDate: z.string().min(1, "Data da doa\xE7\xE3o \xE9 obrigat\xF3ria"),
  donationTime: z.string().min(1, "Hora da doa\xE7\xE3o \xE9 obrigat\xF3ria"),
  notes: z.string().default(""),
  createdAt: z.date()
});
var passwordResetTokenSchema2 = z.object({
  id: z.string(),
  email: z.string().email("Email inv\xE1lido"),
  tokenHash: z.string().min(1, "Token hash \xE9 obrigat\xF3rio"),
  expiresAt: z.date(),
  usedAt: z.date().optional(),
  createdAt: z.date()
});
var insertProvinceSchema = provinceSchema2.omit({
  id: true,
  createdAt: true
});
var insertUserSchema = userSchema2.omit({
  id: true,
  createdAt: true
});
var insertDonorSchema = donorSchema2.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var donorFormSchema = donorSchema2.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true
});
var insertDonationSchema = donationSchema2.omit({
  id: true,
  createdAt: true
});
var insertPasswordResetTokenSchema = passwordResetTokenSchema2.omit({
  id: true,
  createdAt: true
});
var loginSchema = z.object({
  username: z.string().min(1, "Username \xE9 obrigat\xF3rio"),
  password: z.string().min(1, "Password \xE9 obrigat\xF3ria"),
  provinceId: z.string().optional()
  // Optional for admins who have access to all provinces
});
var resetPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password atual \xE9 obrigat\xF3ria"),
  newPassword: z.string().min(6, "Nova password deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirma\xE7\xE3o \xE9 obrigat\xF3ria")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords n\xE3o coincidem",
  path: ["confirmPassword"]
});
var donorSearchSchema = z.object({
  query: z.string().optional(),
  bloodType: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  municipality: z.string().optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  isAptToDonate: z.boolean().optional(),
  availableForFuture: z.boolean().optional(),
  department: z.string().optional(),
  hasHistory: z.boolean().optional(),
  provinceId: z.string().optional(),
  createdDateFrom: z.string().optional(),
  createdDateTo: z.string().optional(),
  lastDonationFrom: z.string().optional(),
  lastDonationTo: z.string().optional(),
  sortBy: z.enum(["name", "age", "bloodType", "createdAt", "lastDonation"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional()
});
var newLeaderSchema = z.object({
  name: z.string().min(1, "Nome \xE9 obrigat\xF3rio"),
  email: z.string().email("Email inv\xE1lido"),
  provinceId: z.string().min(1, "Prov\xEDncia \xE9 obrigat\xF3ria")
});
var updateLeaderSchema = z.object({
  name: z.string().min(1, "Nome \xE9 obrigat\xF3rio"),
  email: z.string().email("Email inv\xE1lido"),
  provinceId: z.string().min(1, "Prov\xEDncia \xE9 obrigat\xF3ria")
});
var passwordRecoverySchema = z.object({
  email: z.string().email("Email inv\xE1lido"),
  provinceId: z.string().optional()
});
var newAdminSchema = z.object({
  name: z.string().min(1, "Nome \xE9 obrigat\xF3rio"),
  email: z.string().email("Email inv\xE1lido"),
  username: z.string().min(1, "Username \xE9 obrigat\xF3rio"),
  provinceId: z.string().min(1, "Prov\xEDncia \xE9 obrigat\xF3ria")
});
var exportDonorsSchema = z.object({
  query: z.string().optional(),
  bloodType: z.string().optional(),
  format: z.enum(["csv", "xlsx"]).default("csv")
});
var exportDonationsSchema = z.object({
  donorId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: z.enum(["csv", "xlsx"]).default("csv")
});
var exportReportSchema = z.object({
  type: z.enum(["overview", "bloodtype", "monthly"]).default("overview"),
  format: z.enum(["csv", "xlsx"]).default("csv")
});

// server/routes.ts
import ExcelJS from "exceljs";
import bcrypt2 from "bcrypt";
import { randomBytes, createHash, timingSafeEqual } from "crypto";

// server/lib/email.ts
var EMAIL_API_BASE = "https://script.google.com/macros/s/AKfycbzUXA3hswDOAbXyPyOf00gYEP_9nswtXYP3Zg4U4GOfaVai-th9yr3rmfatUwNSqiJnYQ/exec";
async function sendProvisionalPassword(email, userName, password) {
  const url = new URL(EMAIL_API_BASE);
  url.searchParams.append("tipo", "senha");
  url.searchParams.append("email", email);
  url.searchParams.append("user", userName);
  url.searchParams.append("senhaprovisoria", password);
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to send provisional password email");
  }
}
async function sendPasswordRecovery(email, userName, token) {
  const url = new URL(EMAIL_API_BASE);
  url.searchParams.append("tipo", "recuperar");
  url.searchParams.append("email", email);
  url.searchParams.append("user", userName);
  url.searchParams.append("token", token);
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to send password recovery email");
  }
}

// server/routes.ts
var requireAuth = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "N\xE3o autenticado" });
  }
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Utilizador n\xE3o encontrado" });
  }
  req.session.provinceId = user.provinceId;
  req.session.userRole = user.role;
  next();
};
var requireAdmin = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "N\xE3o autenticado" });
  }
  const user = await storage.getUser(userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Acesso negado" });
  }
  req.session.provinceId = user.provinceId;
  req.session.userRole = user.role;
  next();
};
async function registerRoutes(app2) {
  app2.get("/api/provinces", async (req, res) => {
    try {
      const provinces = await storage.getAllProvinces();
      res.json(provinces);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt:", { username: req.body.username, hasPassword: !!req.body.password });
      const { username, password, provinceId } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("User not found:", username);
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      console.log("User found:", { id: user.id, username: user.username, role: user.role });
      const isValidPassword = await bcrypt2.compare(password, user.password);
      if (!isValidPassword) {
        console.log("Invalid password for user:", username);
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      console.log("Password valid for user:", username);
      let sessionProvinceId = user.provinceId;
      if (user.role === "leader") {
        if (provinceId && provinceId !== user.provinceId) {
          console.log("Province access denied for leader:", { provided: provinceId, assigned: user.provinceId });
          return res.status(403).json({ message: "Acesso negado \xE0 prov\xEDncia selecionada" });
        }
        sessionProvinceId = provinceId || user.provinceId;
      } else if (user.role === "admin") {
        sessionProvinceId = provinceId || user.provinceId;
      }
      req.session.userId = user.id;
      req.session.provinceId = sessionProvinceId;
      req.session.userRole = user.role;
      console.log("Login successful:", { userId: user.id, sessionProvinceId });
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, provinceContext: sessionProvinceId });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao terminar sess\xE3o" });
      }
      res.json({ message: "Sess\xE3o terminada" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Utilizador n\xE3o encontrado" });
    }
    const { password: _, ...userWithoutPassword } = user;
    const sessionProvinceId = req.session?.provinceId || user.provinceId;
    res.json({ user: userWithoutPassword, provinceContext: sessionProvinceId });
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { currentPassword, newPassword } = resetPasswordSchema.parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utilizador n\xE3o encontrado" });
      }
      const isValidPassword = await bcrypt2.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Password atual incorreta" });
      }
      const hashedNewPassword = await bcrypt2.hash(newPassword, 10);
      await storage.updateUser(userId, {
        password: hashedNewPassword,
        isProvisional: false
      });
      res.json({ message: "Password atualizada com sucesso" });
    } catch (error) {
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, provinceId } = passwordRecoverySchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "Se o email existir, receber\xE1 instru\xE7\xF5es de recupera\xE7\xE3o." });
      }
      if (provinceId && user.provinceId !== provinceId) {
        return res.json({ message: "Se o email existir, receber\xE1 instru\xE7\xF5es de recupera\xE7\xE3o." });
      }
      try {
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await storage.deletePasswordResetTokensByEmail(email);
        await storage.deleteExpiredPasswordResetTokens();
        await storage.createPasswordResetToken({
          email,
          tokenHash,
          expiresAt
        });
        await sendPasswordRecovery(email, user.name, token);
        res.json({ message: "Instru\xE7\xF5es de recupera\xE7\xE3o enviadas por email." });
      } catch (emailError) {
        console.error("Failed to send password recovery email:", emailError);
        res.status(500).json({ message: "Erro ao enviar email. Tente novamente mais tarde." });
      }
    } catch (error) {
      console.error("Password recovery error:", error);
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.post("/api/auth/reset-password-token", async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;
      if (!email || !token || !newPassword) {
        return res.status(400).json({ message: "Dados obrigat\xF3rios em falta" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Nova password deve ter pelo menos 6 caracteres" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Token inv\xE1lido ou expirado" });
      }
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const storedToken = await storage.getPasswordResetTokenByTokenHash(tokenHash);
      if (!storedToken) {
        return res.status(400).json({ message: "Token inv\xE1lido ou expirado" });
      }
      const emailMatches = timingSafeEqual(
        Buffer.from(storedToken.email, "utf8"),
        Buffer.from(email, "utf8")
      );
      if (!emailMatches) {
        return res.status(400).json({ message: "Token inv\xE1lido ou expirado" });
      }
      if (storedToken.expiresAt < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ message: "Token inv\xE1lido ou expirado" });
      }
      if (storedToken.usedAt) {
        return res.status(400).json({ message: "Token inv\xE1lido ou expirado" });
      }
      await storage.markPasswordResetTokenAsUsed(storedToken.id);
      const hashedNewPassword = await bcrypt2.hash(newPassword, 10);
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
  app2.get("/api/donors", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const filters = donorSearchSchema.parse(req.query);
      if (filters.bloodType === "all") {
        filters.bloodType = void 0;
      }
      const donors = await storage.searchDonors(filters, userId, user?.role);
      res.json(donors);
    } catch (error) {
      res.status(400).json({ message: "Par\xE2metros inv\xE1lidos" });
    }
  });
  app2.get("/api/donors/:id", async (req, res) => {
    const donor = await storage.getDonor(req.params.id);
    if (!donor) {
      return res.status(404).json({ message: "Doador n\xE3o encontrado" });
    }
    res.json(donor);
  });
  app2.post("/api/donors", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Utilizador n\xE3o encontrado" });
      }
      const donorData = donorFormSchema.parse(req.body);
      const existingDonor = await storage.getDonorByBiNumber(donorData.biNumber);
      if (existingDonor) {
        return res.status(400).json({ message: "Doador com este BI j\xE1 existe" });
      }
      const donorWithContext = {
        ...donorData,
        provinceId: user.provinceId,
        createdBy: user.id
      };
      const donor = await storage.createDonor(donorWithContext);
      res.status(201).json(donor);
    } catch (error) {
      console.error("Donor creation error:", error);
      console.error("Request body:", req.body);
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.put("/api/donors/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Utilizador n\xE3o encontrado" });
      }
      const existingDonor = await storage.getDonor(req.params.id);
      if (!existingDonor) {
        return res.status(404).json({ message: "Doador n\xE3o encontrado" });
      }
      if (user.role === "leader" && existingDonor.createdBy !== user.id) {
        return res.status(403).json({ message: "S\xF3 pode editar doadores que cadastrou" });
      }
      if (user.role === "admin" && existingDonor.provinceId !== user.provinceId) {
        return res.status(403).json({ message: "S\xF3 pode editar doadores da sua prov\xEDncia" });
      }
      const updates = donorFormSchema.partial().parse(req.body);
      const donor = await storage.updateDonor(req.params.id, updates);
      res.json(donor);
    } catch (error) {
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.delete("/api/donors/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Utilizador n\xE3o encontrado" });
      }
      const existingDonor = await storage.getDonor(req.params.id);
      if (!existingDonor) {
        return res.status(404).json({ message: "Doador n\xE3o encontrado" });
      }
      if (user.role === "leader" && existingDonor.createdBy !== user.id) {
        return res.status(403).json({ message: "S\xF3 pode eliminar doadores que cadastrou" });
      }
      if (user.role === "admin" && existingDonor.provinceId !== user.provinceId) {
        return res.status(403).json({ message: "S\xF3 pode eliminar doadores da sua prov\xEDncia" });
      }
      const deleted = await storage.deleteDonor(req.params.id);
      res.json({ message: "Doador eliminado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/donations/donor/:donorId", async (req, res) => {
    const donations = await storage.getDonationsByDonor(req.params.donorId);
    res.json(donations);
  });
  app2.post("/api/donations", requireAuth, async (req, res) => {
    try {
      const donationData = insertDonationSchema.parse(req.body);
      const donation = await storage.createDonation(donationData);
      res.status(201).json(donation);
    } catch (error) {
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.get("/api/donations/recent", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const limit = parseInt(req.query.limit) || 10;
      const donations = await storage.getRecentDonations(limit, userId, user?.role);
      res.json(donations);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/stats", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const stats = await storage.getDonorStatsWithFilters(void 0, userId, user?.role);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/leaders", async (req, res) => {
    try {
      const userId = req.session?.userId;
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
  app2.post("/api/leaders", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const { name, email, provinceId } = newLeaderSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Utilizador com este email j\xE1 existe" });
      }
      const provisionalPassword = Math.random().toString(36).slice(-8);
      const newLeader = await storage.createUser({
        username: email,
        email,
        password: provisionalPassword,
        name,
        role: "leader",
        provinceId,
        isProvisional: true
      });
      try {
        await sendProvisionalPassword(email, name, provisionalPassword);
      } catch (emailError) {
        console.error("Failed to send provisional password email:", emailError);
      }
      const { password: _, ...leaderWithoutPassword } = newLeader;
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
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.put("/api/leaders/:id", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const leaderId = req.params.id;
      const { name, email, provinceId } = updateLeaderSchema.parse(req.body);
      const existingLeader = await storage.getUser(leaderId);
      if (!existingLeader) {
        return res.status(404).json({ message: "L\xEDder n\xE3o encontrado" });
      }
      const userWithEmail = await storage.getUserByEmail(email);
      if (userWithEmail && userWithEmail.id !== leaderId) {
        return res.status(400).json({ message: "Utilizador com este email j\xE1 existe" });
      }
      const updatedLeader = await storage.updateUser(leaderId, {
        name,
        email,
        username: email,
        provinceId
      });
      if (!updatedLeader) {
        return res.status(404).json({ message: "L\xEDder n\xE3o encontrado" });
      }
      const { password: _, ...leaderWithoutPassword } = updatedLeader;
      res.json(leaderWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.delete("/api/leaders/:id", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const leaderId = req.params.id;
      if (leaderId === userId) {
        return res.status(400).json({ message: "N\xE3o pode eliminar o pr\xF3prio utilizador" });
      }
      const deleted = await storage.deleteUser(leaderId);
      if (!deleted) {
        return res.status(404).json({ message: "L\xEDder n\xE3o encontrado" });
      }
      res.json({ message: "L\xEDder eliminado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user2 }) => user2);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.post("/api/admin/cleanup-tokens", requireAdmin, async (req, res) => {
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
  app2.get("/api/debug/system-status", async (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({ message: "Not found" });
    }
    try {
      const userCount = await storage.getUsers();
      const provinceCount = await storage.getAllProvinces();
      res.json({
        users: userCount.length,
        provinces: provinceCount.length,
        hasAdmin: userCount.some((u) => u.role === "admin"),
        adminUsers: userCount.filter((u) => u.role === "admin").map((u) => ({
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
  app2.post("/api/debug/test-credentials", async (req, res) => {
    if (process.env.NODE_ENV !== "development") {
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
      const isValidPassword = await bcrypt2.compare(password, user.password);
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
  app2.post("/api/admin/register-emergency", async (req, res) => {
    try {
      const { emergencyKey, name, email, username, provinceId, password } = req.body;
      if (process.env.NODE_ENV === "production" && emergencyKey !== process.env.EMERGENCY_ADMIN_KEY) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      if (!name || !email || !username || !provinceId || !password) {
        return res.status(400).json({ message: "Todos os campos s\xE3o obrigat\xF3rios" });
      }
      const existingByEmail = await storage.getUserByEmail(email);
      const existingByUsername = await storage.getUserByUsername(username);
      if (existingByEmail || existingByUsername) {
        return res.status(400).json({ message: "Utilizador j\xE1 existe com este email ou username" });
      }
      const adminCount = await storage.getAdminCountByProvince(provinceId);
      if (adminCount >= 5) {
        return res.status(400).json({ message: "Limite m\xE1ximo de 5 administradores por prov\xEDncia atingido" });
      }
      const newAdmin = await storage.createUser({
        username,
        email,
        password,
        // Will be hashed in storage
        name,
        role: "admin",
        provinceId,
        isProvisional: false
        // Emergency admin doesn't need to reset password
      });
      const { password: _, ...adminWithoutPassword } = newAdmin;
      console.log(`Emergency admin created: ${email} for province: ${provinceId} at ${(/* @__PURE__ */ new Date()).toISOString()}`);
      res.status(201).json({
        message: "Administrador de emerg\xEAncia criado com sucesso",
        admin: adminWithoutPassword
      });
    } catch (error) {
      console.error("Emergency admin creation error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  function generateCSV(headers, rows) {
    const csvHeaders = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
    const csvRows = rows.map(
      (row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")
    );
    return "\uFEFF" + csvHeaders + "\n" + csvRows.join("\n");
  }
  async function generateExcel(worksheets) {
    const workbook = new ExcelJS.Workbook();
    for (const ws of worksheets) {
      const worksheet = workbook.addWorksheet(ws.name);
      worksheet.addRow(ws.headers);
      worksheet.getRow(1).font = { bold: true };
      for (const row of ws.rows) {
        worksheet.addRow(row);
      }
      worksheet.columns.forEach((column, index) => {
        const header = ws.headers[index];
        column.width = Math.max(header.length, 15);
      });
    }
    return await workbook.xlsx.writeBuffer();
  }
  app2.get("/api/export/donors", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const { query, bloodType, format } = exportDonorsSchema.parse(req.query);
      const filters = { query, bloodType };
      const donors = await storage.searchDonors(filters, userId, user?.role);
      const headers = [
        "N\xFAmero do BI",
        "Nome Completo",
        "Data de Nascimento",
        "Idade",
        "G\xEAnero",
        "Munic\xEDpio",
        "Bairro",
        "Contato",
        "Cargo",
        "Departamento",
        "Tipo Sangu\xEDneo",
        "Fator RH",
        "Tem Hist\xF3rico",
        "Doa\xE7\xF5es Anteriores",
        "\xDAltima Doa\xE7\xE3o",
        "Restri\xE7\xF5es M\xE9dicas",
        "Apto para Doar",
        "Dispon\xEDvel para Futuro",
        "Contato Preferido",
        "Observa\xE7\xF5es"
      ];
      const rows = donors.map((donor) => [
        donor.biNumber,
        donor.fullName,
        donor.birthDate,
        donor.age.toString(),
        donor.gender === "M" ? "Masculino" : "Feminino",
        donor.municipality,
        donor.neighborhood,
        donor.contact,
        donor.position,
        donor.department,
        donor.bloodType,
        donor.rhFactor === "positive" ? "Positivo" : "Negativo",
        donor.hasHistory ? "Sim" : "N\xE3o",
        donor.previousDonations.toString(),
        donor.lastDonation,
        donor.medicalRestrictions,
        donor.isAptToDonate ? "Sim" : "N\xE3o",
        donor.availableForFuture ? "Sim" : "N\xE3o",
        donor.preferredContact,
        donor.observations
      ]);
      const filename = `doadores_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
      if (format === "xlsx") {
        const buffer = await generateExcel([{ name: "Doadores", headers, rows }]);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else {
        const csv = generateCSV(headers, rows);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error("Export donors error:", error);
      res.status(400).json({ message: "Par\xE2metros inv\xE1lidos" });
    }
  });
  app2.get("/api/export/donations", requireAuth, async (req, res) => {
    try {
      const { donorId, dateFrom, dateTo, format } = exportDonationsSchema.parse(req.query);
      const donations = await storage.getDonationsWithFilters({ donorId, dateFrom, dateTo });
      const headers = [
        "ID da Doa\xE7\xE3o",
        "N\xFAmero do BI",
        "Nome do Doador",
        "Tipo Sangu\xEDneo",
        "Data da Doa\xE7\xE3o",
        "Hora da Doa\xE7\xE3o",
        "Observa\xE7\xF5es"
      ];
      const rows = donations.map((donation) => [
        donation.id,
        donation.donorBiNumber,
        donation.donorName,
        donation.bloodType,
        donation.donationDate,
        donation.donationTime,
        donation.notes
      ]);
      const filename = `doacoes_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
      if (format === "xlsx") {
        const buffer = await generateExcel([{ name: "Doa\xE7\xF5es", headers, rows }]);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else {
        const csv = generateCSV(headers, rows);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error("Export donations error:", error);
      res.status(400).json({ message: "Par\xE2metros inv\xE1lidos" });
    }
  });
  app2.get("/api/export/reports", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Utilizador n\xE3o encontrado" });
      }
      const { type, format } = exportReportSchema.parse(req.query);
      const stats = await storage.getDonorStatsWithFilters(void 0, userId, user.role);
      let worksheets = [];
      if (type === "overview") {
        const overviewHeaders = ["M\xE9trica", "Valor"];
        const overviewRows = [
          ["Total de Doadores", stats.totalDonors.toString()],
          ["Total de Doa\xE7\xF5es", stats.totalDonations.toString()],
          ["Doadores Ativos", stats.activeDonors.toString()],
          ["Novos Este M\xEAs", stats.newThisMonth.toString()]
        ];
        const bloodTypeHeaders = ["Tipo Sangu\xEDneo", "Quantidade", "Percentual"];
        const bloodTypeRows = Object.entries(stats.bloodTypeStats).map(([type2, stat]) => [
          type2,
          stat.count.toString(),
          `${stat.percentage}%`
        ]);
        worksheets = [
          { name: "Vis\xE3o Geral", headers: overviewHeaders, rows: overviewRows },
          { name: "Por Tipo Sangu\xEDneo", headers: bloodTypeHeaders, rows: bloodTypeRows }
        ];
      }
      const filename = `relatorio_${type}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
      if (format === "xlsx") {
        const buffer = await generateExcel(worksheets);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else {
        const allHeaders = ["Tipo", "Item", "Valor"];
        const allRows = [
          ...worksheets[0].rows.map((row) => ["Geral", row[0], row[1]]),
          ...worksheets[1].rows.map((row) => ["Tipo Sangu\xEDneo", row[0], `${row[1]} (${row[2]})`])
        ];
        const csv = generateCSV(allHeaders, allRows);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error("Export reports error:", error);
      res.status(400).json({ message: "Par\xE2metros inv\xE1lidos" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    ...process.env.NODE_ENV === "development" ? [] : [runtimeErrorOverlay()],
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    hmr: {
      overlay: false
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "cruz-vermelha-angola-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
