const Contact = require('../models/Contact');
const { asyncHandler, paginate, getPaginationMeta } = require('../utils/helpers');
const { NotFoundError, ValidationError } = require('../utils/errors');
const env = require('../config/env');

// @desc    List all contacts
// @route   GET /api/contacts
// @access  Private
const list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, isBlocked, isGroup } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const sessionId = env.SESSION_ID;

    const filter = { sessionId };
    if (search) {
        filter.$or = [
            { pushName: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } },
            { displayName: { $regex: search, $options: 'i' } }
        ];
    }
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';
    if (isGroup !== undefined) filter.isGroup = isGroup === 'true';

    const [contacts, total] = await Promise.all([
        Contact.find(filter).sort({ lastInteraction: -1 }).skip(skip).limit(lim),
        Contact.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: { contacts, pagination: getPaginationMeta(total, page, lim) }
    });
});

// @desc    Get contact
// @route   GET /api/contacts/:id
// @access  Private
const get = asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);
    if (!contact) throw new NotFoundError('Contact not found');

    res.json({
        success: true,
        data: { contact }
    });
});

// @desc    Create contact
// @route   POST /api/contacts
// @access  Private
const create = asyncHandler(async (req, res) => {
    const { jid, phoneNumber, pushName, displayName, tags, notes } = req.body;

    if (!jid) throw new ValidationError('JID is required');

    const existing = await Contact.findOne({ sessionId: env.SESSION_ID, jid });
    if (existing) throw new ValidationError('Contact already exists');

    const contact = await Contact.create({
        sessionId: env.SESSION_ID,
        jid,
        phoneNumber: phoneNumber || jid.split('@')[0],
        pushName,
        displayName,
        tags: tags || [],
        notes
    });

    res.status(201).json({
        success: true,
        message: 'Contact created',
        data: { contact }
    });
});

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
const update = asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);
    if (!contact) throw new NotFoundError('Contact not found');

    const { pushName, displayName, tags, notes, isBlocked } = req.body;

    if (pushName !== undefined) contact.pushName = pushName;
    if (displayName !== undefined) contact.displayName = displayName;
    if (tags !== undefined) contact.tags = tags;
    if (notes !== undefined) contact.notes = notes;
    if (isBlocked !== undefined) contact.isBlocked = isBlocked;

    await contact.save();

    res.json({
        success: true,
        message: 'Contact updated',
        data: { contact }
    });
});

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private
const remove = asyncHandler(async (req, res) => {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) throw new NotFoundError('Contact not found');

    res.json({
        success: true,
        message: 'Contact deleted'
    });
});

// @desc    Block contact
// @route   PATCH /api/contacts/:id/block
// @access  Private
const block = asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);
    if (!contact) throw new NotFoundError('Contact not found');

    contact.isBlocked = !contact.isBlocked;
    await contact.save();

    res.json({
        success: true,
        message: contact.isBlocked ? 'Contact blocked' : 'Contact unblocked',
        data: { contact }
    });
});

module.exports = { list, get, create, update, remove, block };