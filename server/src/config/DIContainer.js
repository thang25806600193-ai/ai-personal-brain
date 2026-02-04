/**
 * Dependency Injection Container
 * Factory để tạo tất cả services và controllers với dependencies đã được inject
 * DIP: Tập trung quản lý dependencies ở đây
 */

const { getPrismaClient } = require('../config/database');

// Repositories
const UserRepository = require('../repositories/UserRepository');
const SubjectRepository = require('../repositories/SubjectRepository');
const DocumentRepository = require('../repositories/DocumentRepository');
const ConceptRepository = require('../repositories/ConceptRepository');
const ShareRepository = require('../repositories/ShareRepository');
const SharedWithUserRepository = require('../repositories/SharedWithUserRepository');

// Services
const AuthService = require('../services/authService');
const UserService = require('../services/userService');
const SubjectService = require('../services/subjectService');
const DocumentService = require('../services/documentService');
const ConceptService = require('../services/conceptService');
const QAService = require('../services/qaService');
const AIService = require('../services/aiService');
const UploadService = require('../services/uploadService');
const ShareService = require('../services/shareService');
const { sendVerificationEmail } = require('../services/emailService');

// Controllers
const AuthController = require('../controllers/authController');
const UserController = require('../controllers/userController');
const SubjectController = require('../controllers/subjectController');
const DocumentController = require('../controllers/documentController');
const ShareController = require('../controllers/shareController');
const ConceptController = require('../controllers/conceptController');

class DIContainer {
  constructor() {
    this.prisma = getPrismaClient();
    this.instances = {};
  }

  /**
   * Lấy hoặc tạo Repository
   */
  getUserRepository() {
    if (!this.instances.userRepository) {
      this.instances.userRepository = new UserRepository(this.prisma);
    }
    return this.instances.userRepository;
  }

  getSubjectRepository() {
    if (!this.instances.subjectRepository) {
      this.instances.subjectRepository = new SubjectRepository(this.prisma);
    }
    return this.instances.subjectRepository;
  }

  getDocumentRepository() {
    if (!this.instances.documentRepository) {
      this.instances.documentRepository = new DocumentRepository(this.prisma);
    }
    return this.instances.documentRepository;
  }

  getConceptRepository() {
    if (!this.instances.conceptRepository) {
      this.instances.conceptRepository = new ConceptRepository(this.prisma);
    }
    return this.instances.conceptRepository;
  }

  getShareRepository() {
    if (!this.instances.shareRepository) {
      this.instances.shareRepository = new ShareRepository(this.prisma);
    }
    return this.instances.shareRepository;
  }

  getSharedWithUserRepository() {
    if (!this.instances.sharedWithUserRepository) {
      this.instances.sharedWithUserRepository = new SharedWithUserRepository(this.prisma);
    }
    return this.instances.sharedWithUserRepository;
  }

  /**
   * Lấy hoặc tạo Service
   */
  getAIService() {
    if (!this.instances.aiService) {
      this.instances.aiService = new AIService();
    }
    return this.instances.aiService;
  }

  getAuthService() {
    if (!this.instances.authService) {
      this.instances.authService = new AuthService(
        this.getUserRepository(),
        { sendVerificationEmail }
      );
    }
    return this.instances.authService;
  }

  getUserService() {
    if (!this.instances.userService) {
      this.instances.userService = new UserService(this.getUserRepository());
    }
    return this.instances.userService;
  }

  getSubjectService() {
    if (!this.instances.subjectService) {
      this.instances.subjectService = new SubjectService(
        this.getSubjectRepository(),
        this.getDocumentRepository(),
        this.getConceptRepository()
      );
    }
    return this.instances.subjectService;
  }

  getDocumentService() {
    if (!this.instances.documentService) {
      this.instances.documentService = new DocumentService(
        this.getDocumentRepository(),
        this.getConceptRepository(),
        this.getSubjectRepository(),
        this.getAIService()
      );
    }
    return this.instances.documentService;
  }

  getConceptService() {
    if (!this.instances.conceptService) {
      this.instances.conceptService = new ConceptService(
        this.getConceptRepository(),
        this.getDocumentRepository(),
        this.getSubjectRepository(),
        this.getAIService()
      );
    }
    return this.instances.conceptService;
  }

  getShareService() {
    if (!this.instances.shareService) {
      this.instances.shareService = new ShareService(
        this.getShareRepository(),
        this.getSubjectRepository(),
        this.getSubjectService(),
        this.getSharedWithUserRepository(),
        this.getUserRepository()
      );
    }
    return this.instances.shareService;
  }

  getQAService() {
    if (!this.instances.qaService) {
      this.instances.qaService = new QAService(
        this.getSubjectRepository(),
        this.getAIService()
      );
    }
    return this.instances.qaService;
  }

  getUploadService() {
    if (!this.instances.uploadService) {
      this.instances.uploadService = new UploadService();
    }
    return this.instances.uploadService;
  }

  /**
   * Lấy Controllers
   */
  getAuthController() {
    return AuthController(this.getAuthService());
  }

  getUserController() {
    return UserController(this.getUserService(), this.getUploadService());
  }

  getSubjectController() {
    return SubjectController(this.getSubjectService(), this.getQAService());
  }

  getDocumentController() {
    return DocumentController(this.getDocumentService());
  }

  getConceptController() {
    return ConceptController(this.getConceptService());
  }

  getShareController() {
    return ShareController(this.getShareService());
  }

  /**
   * Clean up
   */
  async destroy() {
    // Close database connection
    // await this.prisma.$disconnect();
  }
}

// Singleton instance
let container = null;

const getContainer = () => {
  if (!container) {
    container = new DIContainer();
  }
  return container;
};

module.exports = {
  getContainer,
  DIContainer,
};
