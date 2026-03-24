/**
 * @fileoverview Authentication controller for the Novence API.
 * Handles user registration, login, profile updates, and password changes.
 * All passwords are hashed with bcrypt; sessions use stateless JWTs.
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../config/db");
const logger = require("../config/logger");







async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    }


    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }


    const passwordHash = await bcrypt.hash(password, 10);


    const user = await prisma.user.create({
      data: { email, passwordHash, name }
    });


    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        profileGoal: user.profileGoal,
        profileIncomeRange: user.profileIncomeRange,
        profileCategories: user.profileCategories ?
        JSON.parse(user.profileCategories) :
        null
      }
    });
  } catch (err) {
    logger.error("Register error:", err);
    res.status(500).json({ error: "REGISTER_FAILED" });
  }
}







async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    }


    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }


    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }


    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        profileGoal: user.profileGoal,
        profileIncomeRange: user.profileIncomeRange,
        profileCategories: user.profileCategories ?
        JSON.parse(user.profileCategories) :
        null
      }
    });
  } catch (err) {
    logger.error("Login error:", err);
    res.status(500).json({ error: "LOGIN_FAILED" });
  }
}








async function updateProfile(req, res) {
  try {
    const { name, email, avatar } = req.body;
    const userId = req.userId;


    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({ error: "EMAIL_ALREADY_IN_USE" });
      }
      updateData.email = email;
    }
    if (avatar !== undefined) {
      if (avatar !== null) {
        if (typeof avatar !== "string" || !avatar.startsWith("data:image/")) {
          return res.status(400).json({ error: "INVALID_AVATAR_FORMAT" });
        }
        if (avatar.length > 1_500_000) {
          return res.status(400).json({ error: "AVATAR_TOO_LARGE" });
        }
      }
      updateData.avatar = avatar;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null
      }
    });
  } catch (err) {
    logger.error("Update profile error:", err);
    res.status(500).json({ error: "PROFILE_UPDATE_FAILED" });
  }
}








async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "BOTH_PASSWORDS_REQUIRED" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "CURRENT_PASSWORD_INCORRECT" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.json({ message: "PASSWORD_CHANGED" });
  } catch (err) {
    logger.error("Change password error:", err);
    res.status(500).json({ error: "PASSWORD_CHANGE_FAILED" });
  }
}


const VALID_GOALS = [
"savings",
"expense_control",
"investment",
"debt_freedom"];

const VALID_INCOME_RANGES = [
"under_1500",
"1500_3000",
"3000_6000",
"over_6000"];

const VALID_CATEGORIES = [
"food",
"transport",
"shopping",
"utilities",
"housing",
"entertainment",
"health",
"other"];









async function saveOnboardingProfile(req, res) {
  try {
    const { goal, incomeRange, priorityCategories } = req.body;
    const userId = req.userId;


    if (goal && !VALID_GOALS.includes(goal)) {
      return res.status(400).json({ error: "INVALID_GOAL" });
    }


    if (incomeRange && !VALID_INCOME_RANGES.includes(incomeRange)) {
      return res.status(400).json({ error: "INVALID_INCOME_RANGE" });
    }


    if (priorityCategories) {
      if (!Array.isArray(priorityCategories)) {
        return res.status(400).json({ error: "CATEGORIES_MUST_BE_ARRAY" });
      }
      const invalid = priorityCategories.filter(
        (c) => !VALID_CATEGORIES.includes(c)
      );
      if (invalid.length > 0) {
        return res.status(400).json({ error: "INVALID_CATEGORIES", invalid });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        profileGoal: goal || null,
        profileIncomeRange: incomeRange || null,
        profileCategories: priorityCategories ?
        JSON.stringify(priorityCategories) :
        null
      }
    });

    res.json({
      profile: {
        goal: user.profileGoal,
        incomeRange: user.profileIncomeRange,
        priorityCategories: user.profileCategories ?
        JSON.parse(user.profileCategories) :
        []
      }
    });
  } catch (err) {
    logger.error("Save onboarding profile error:", err);
    res.status(500).json({ error: "PROFILE_SAVE_FAILED" });
  }
}

module.exports = {
  register,
  login,
  updateProfile,
  changePassword,
  saveOnboardingProfile
};