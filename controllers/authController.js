const User = require('../models/User');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { asyncHandler } = require('../utils/helpers');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ValidationError('User with that email or username already exists');
    }

    const user = await User.create({ username, email, password });

    const token = user.generateToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user: user.toJSON(), token, refreshToken }
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ValidationError('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated');
    }

    const token = user.generateToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.json({
        success: true,
        message: 'Login successful',
        data: { user: user.toJSON(), token, refreshToken }
    });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: { user: req.user }
    });
});

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const { username, email } = req.body;
    const user = req.user;

    if (username) user.username = username;
    if (email) user.email = email;

    await user.save();

    res.json({
        success: true,
        message: 'Profile updated',
        data: { user: user.toJSON() }
    });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;

    if (!token) {
        throw new ValidationError('Refresh token is required');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
        throw new UnauthorizedError('Invalid refresh token');
    }

    const newToken = user.generateToken();
    const newRefreshToken = user.generateRefreshToken();
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
        success: true,
        data: { token: newToken, refreshToken: newRefreshToken }
    });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
    req.user.refreshToken = null;
    await req.user.save();

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = { register, login, getMe, updateProfile, refreshToken, logout };