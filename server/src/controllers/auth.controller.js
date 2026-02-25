/**
 * @fileoverview Authentication controller for the Novence API.
 * Handles user registration, login, profile updates, and password changes.
 * All passwords are hashed with bcrypt; sessions use stateless JWTs.
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../config/db");
const logger = require("../config/logger");

/**
 * POST /api/auth/register
 * Body: { email, password, name? }
 *
 * Creates a new user account and returns a JWT.
 */
async function register(req, res) {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "EMAIL_PASSWORD_REQUIRED" });
        }

        // Check whether the email is already taken
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: { email, passwordHash, name },
        });

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (err) {
        logger.error("Register error:", err);
        res.status(500).json({ error: "REGISTER_FAILED" });
    }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Authenticates the user and returns a JWT.
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "EMAIL_PASSWORD_REQUIRED" });
        }

        // Find user by email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "INVALID_CREDENTIALS" });
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: "INVALID_CREDENTIALS" });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (err) {
        logger.error("Login error:", err);
        res.status(500).json({ error: "LOGIN_FAILED" });
    }
}

/**
 * PUT /api/auth/profile
 * Body: { name?, email? }
 * Requires JWT.
 *
 * Updates the authenticated user's profile fields.
 */
async function updateProfile(req, res) {
    try {
        const { name, email } = req.body;
        const userId = req.userId;

        // Build update data
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) {
            // Check if email is taken by another user
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing && existing.id !== userId) {
                return res
                    .status(409)
                    .json({ error: "EMAIL_ALREADY_IN_USE" });
            }
            updateData.email = email;
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        res.json({
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (err) {
        logger.error("Update profile error:", err);
        res.status(500).json({ error: "PROFILE_UPDATE_FAILED" });
    }
}

/**
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * Requires JWT.
 *
 * Validates the current password and updates to the new one.
 */
async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId;

        if (!currentPassword || !newPassword) {
            return res
                .status(400)
                .json({ error: "BOTH_PASSWORDS_REQUIRED" });
        }

        if (newPassword.length < 6) {
            return res
                .status(400)
                .json({ error: "PASSWORD_TOO_SHORT" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: "CURRENT_PASSWORD_INCORRECT" });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        res.json({ message: "PASSWORD_CHANGED" });
    } catch (err) {
        logger.error("Change password error:", err);
        res.status(500).json({ error: "PASSWORD_CHANGE_FAILED" });
    }
}

module.exports = { register, login, updateProfile, changePassword };
