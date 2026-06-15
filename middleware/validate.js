const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && (!value || value.toString().trim() === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value) {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${field} must be at most ${rules.maxLength} characters`);
                }
                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
                }
                if (rules.match && !rules.match.test(value)) {
                    errors.push(rules.message || `${field} format is invalid`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        next();
    };
};

module.exports = validate;