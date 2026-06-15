const Rule = require('../models/Rule');
const { asyncHandler, paginate, getPaginationMeta } = require('../utils/helpers');
const { NotFoundError, ValidationError } = require('../utils/errors');
const env = require('../config/env');

// @desc    List all rules
// @route   GET /api/rules
// @access  Private
const list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, category, enabled } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const sessionId = env.SESSION_ID;

    const filter = { sessionId };
    if (category) filter.category = category;
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const [rules, total] = await Promise.all([
        Rule.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(lim),
        Rule.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: { rules, pagination: getPaginationMeta(total, page, lim) }
    });
});

// @desc    Create rule
// @route   POST /api/rules
// @access  Private
const create = asyncHandler(async (req, res) => {
    const { trigger, response, matchType, category, groupId, priority } = req.body;

    if (!trigger || !response) {
        throw new ValidationError('Trigger and response are required');
    }

    const rule = await Rule.create({
        sessionId: env.SESSION_ID,
        trigger,
        response,
        matchType: matchType || 'contains',
        category: category || 'global',
        groupId: groupId || null,
        priority: priority || 0,
        createdBy: req.user?.username || 'admin'
    });

    res.status(201).json({
        success: true,
        message: 'Rule created',
        data: { rule }
    });
});

// @desc    Update rule
// @route   PUT /api/rules/:id
// @access  Private
const update = asyncHandler(async (req, res) => {
    const rule = await Rule.findById(req.params.id);
    if (!rule) throw new NotFoundError('Rule not found');

    const { trigger, response, matchType, category, groupId, priority } = req.body;

    if (trigger !== undefined) rule.trigger = trigger;
    if (response !== undefined) rule.response = response;
    if (matchType !== undefined) rule.matchType = matchType;
    if (category !== undefined) rule.category = category;
    if (groupId !== undefined) rule.groupId = groupId;
    if (priority !== undefined) rule.priority = priority;

    await rule.save();

    res.json({
        success: true,
        message: 'Rule updated',
        data: { rule }
    });
});

// @desc    Delete rule
// @route   DELETE /api/rules/:id
// @access  Private
const remove = asyncHandler(async (req, res) => {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    if (!rule) throw new NotFoundError('Rule not found');

    res.json({
        success: true,
        message: 'Rule deleted'
    });
});

// @desc    Toggle rule
// @route   PATCH /api/rules/:id/toggle
// @access  Private
const toggle = asyncHandler(async (req, res) => {
    const rule = await Rule.findById(req.params.id);
    if (!rule) throw new NotFoundError('Rule not found');

    rule.enabled = !rule.enabled;
    await rule.save();

    res.json({
        success: true,
        message: rule.enabled ? 'Rule enabled' : 'Rule disabled',
        data: { rule }
    });
});

module.exports = { list, create, update, remove, toggle };