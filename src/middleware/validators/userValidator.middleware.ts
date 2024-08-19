import { body } from 'express-validator';
const validationHandler = require('./validationHandler');


export const createUserSchema = [
    body('username')
        .exists()
        .withMessage('username is required')
        .isLength({ min: 3 })
        .withMessage('Must be at least 3 chars long'),
    body('first_name')
        .exists()
        .withMessage('Your first name is required')
        .isAlpha()
        .withMessage('Must be only alphabetical chars')
        .isLength({ min: 2 })
        .withMessage('Must be at least 3 chars long'),
    body('last_name')
        .exists()
        .withMessage('Your last name is required')
        .isAlpha()
        .withMessage('Must be only alphabetical chars')
        .isLength({ min: 3 })
        .withMessage('Must be at least 3 chars long'),
    body('gender')
        .exists()
        .withMessage('Your Gender is required')
        .isAlpha()
        .withMessage('Must be only alphabetical chars')
        .isLength({ min: 3 })
        .withMessage('Must be at least 3 chars long'),
    body('email')
        .exists()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Must be a valid email')
        .normalizeEmail(),
    body('phone')
        .exists()
        .withMessage('Phone is required')
        .isLength({ min: 10 })
        .withMessage('Phone must contain at least 10 characters'),
    body('password')
        .exists()
        .withMessage('Password is required')
        .notEmpty()
        .isLength({ min: 6 })
        .withMessage('Password must contain at least 6 characters'),
    body('confirm_password')
        .exists()
        .custom((value, { req }) => value === req.body.password)
        .withMessage('confirm_password field must have the same value as the password field'),
    body('dob')
        .optional(),
    validationHandler
    
];


export const updateUserAboutSchema = [
    body('about')
        .exists()
        .withMessage('About is required')
        .isLength({ min: 20 })
        .withMessage('About Must be at least 20 chars long'),
    validationHandler
    
];