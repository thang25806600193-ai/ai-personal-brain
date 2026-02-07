/**
 * Input Validation Middleware
 * Using express-validator for secure input validation
 * Prevents injection attacks and invalid data
 */

const { body, param, query, validationResult } = require('express-validator');
const ValidationException = require('../exceptions/ValidationException');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    throw new ValidationException(firstError.msg, firstError.param);
  }
  next();
};

/**
 * Auth validation rules
 */
const validateRegister = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải có chữ hoa, chữ thường và số'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên phải từ 2-100 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage('Tên chỉ chứa chữ cái'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password là bắt buộc'),
  handleValidationErrors,
];

/**
 * Document validation rules
 */
const validateDocumentUpload = [
  body('subjectId')
    .trim()
    .notEmpty()
    .withMessage('SubjectId là bắt buộc')
    .isUUID()
    .withMessage('SubjectId không hợp lệ'),
  handleValidationErrors,
];

const validateDocumentId = [
  param('documentId')
    .trim()
    .isUUID()
    .withMessage('DocumentId không hợp lệ'),
  handleValidationErrors,
];

/**
 * Subject validation rules
 */
const validateCreateSubject = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên môn học là bắt buộc')
    .isLength({ min: 2, max: 200 })
    .withMessage('Tên môn học phải từ 2-200 ký tự'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được quá 1000 ký tự'),
  handleValidationErrors,
];

const validateSubjectId = [
  param('subjectId')
    .trim()
    .isUUID()
    .withMessage('SubjectId không hợp lệ'),
  handleValidationErrors,
];

/**
 * Concept validation rules
 */
const validateCreateConcept = [
  body('term')
    .trim()
    .notEmpty()
    .withMessage('Term là bắt buộc')
    .isLength({ min: 2, max: 200 })
    .withMessage('Term phải từ 2-200 ký tự'),
  body('definition')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Definition không được quá 2000 ký tự'),
  body('subjectId')
    .trim()
    .isUUID()
    .withMessage('SubjectId không hợp lệ'),
  handleValidationErrors,
];

/**
 * Question validation
 */
const validateQuestion = [
  body('question')
    .trim()
    .notEmpty()
    .withMessage('Câu hỏi là bắt buộc')
    .isLength({ min: 5, max: 500 })
    .withMessage('Câu hỏi phải từ 5-500 ký tự'),
  handleValidationErrors,
];

/**
 * Quiz validation rules
 */
const validateQuizGenerate = [
  body('count')
    .optional()
    .isInt({ min: 5, max: 50 })
    .withMessage('Số lượng câu hỏi phải từ 5-50'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Độ khó phải là: easy, medium hoặc hard'),
  handleValidationErrors,
];

const validateQuizSubmit = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Answers phải là mảng không rỗng'),
  body('answers.*.questionId')
    .trim()
    .notEmpty()
    .withMessage('Mỗi answer phải có questionId'),
  body('answers.*.answer')
    .trim()
    .notEmpty()
    .withMessage('Mỗi answer phải có câu trả lời'),
  body('answersToken')
    .trim()
    .notEmpty()
    .withMessage('answersToken là bắt buộc'),
  handleValidationErrors,
];

const validateExplainAnswer = [
  body('conceptId')
    .trim()
    .isUUID()
    .withMessage('conceptId không hợp lệ'),
  body('question')
    .trim()
    .notEmpty()
    .withMessage('question là bắt buộc'),
  body('userAnswer')
    .trim()
    .notEmpty()
    .withMessage('userAnswer là bắt buộc'),
  body('correctAnswer')
    .trim()
    .notEmpty()
    .withMessage('correctAnswer là bắt buộc'),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateDocumentUpload,
  validateDocumentId,
  validateCreateSubject,
  validateSubjectId,
  validateCreateConcept,
  validateQuestion,
  validateQuizGenerate,
  validateQuizSubmit,
  validateExplainAnswer,
  handleValidationErrors,
};
