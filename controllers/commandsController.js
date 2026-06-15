const Command = require('../models/Command');
const { asyncHandler, paginate, getPaginationMeta } = require('../utils/helpers');
const { NotFoundError, ValidationError } = require('../utils/errors');
const env = require('../config/env');

// @desc    List all custom commands
// @route   GET /api/commands
// @access  Private
const list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, category, enabled } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const sessionId = env.SESSION_ID;

    const filter = { sessionId };
    if (category) filter.category = category;
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const [commands, total] = await Promise.all([
        Command.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
        Command.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: { commands, pagination: getPaginationMeta(total, page, lim) }
    });
});

// @desc    Create command
// @route   POST /api/commands
// @access  Private
const create = asyncHandler(async (req, res) => {
    const { name, description, category, response, aliases, cooldown, adminOnly } = req.body;

    if (!name || !response) {
        throw new ValidationError('Name and response are required');
    }

    const existing = await Command.findOne({ sessionId: env.SESSION_ID, name });
    if (existing) {
        throw new ValidationError('Command with this name already exists');
    }

    const command = await Command.create({
        sessionId: env.SESSION_ID,
        name,
        description: description || '',
        category: category || 'custom',
        response,
        aliases: aliases || [],
        cooldown: cooldown || 5,
        adminOnly: adminOnly || false,
        createdBy: req.user?.username || 'admin'
    });

    res.status(201).json({
        success: true,
        message: 'Command created',
        data: { command }
    });
});

// @desc    Update command
// @route   PUT /api/commands/:id
// @access  Private
const update = asyncHandler(async (req, res) => {
    const command = await Command.findById(req.params.id);
    if (!command) throw new NotFoundError('Command not found');

    const { name, description, category, response, aliases, cooldown, adminOnly } = req.body;

    if (name !== undefined) command.name = name;
    if (description !== undefined) command.description = description;
    if (category !== undefined) command.category = category;
    if (response !== undefined) command.response = response;
    if (aliases !== undefined) command.aliases = aliases;
    if (cooldown !== undefined) command.cooldown = cooldown;
    if (adminOnly !== undefined) command.adminOnly = adminOnly;

    await command.save();

    res.json({
        success: true,
        message: 'Command updated',
        data: { command }
    });
});

// @desc    Delete command
// @route   DELETE /api/commands/:id
// @access  Private
const remove = asyncHandler(async (req, res) => {
    const command = await Command.findByIdAndDelete(req.params.id);
    if (!command) throw new NotFoundError('Command not found');

    res.json({
        success: true,
        message: 'Command deleted'
    });
});

// @desc    Toggle command
// @route   PATCH /api/commands/:id/toggle
// @access  Private
const toggle = asyncHandler(async (req, res) => {
    const command = await Command.findById(req.params.id);
    if (!command) throw new NotFoundError('Command not found');

    command.enabled = !command.enabled;
    await command.save();

    res.json({
        success: true,
        message: command.enabled ? 'Command enabled' : 'Command disabled',
        data: { command }
    });
});

module.exports = { list, create, update, remove, toggle };