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
const SuggestionRepository = require('../repositories/SuggestionRepository');
const QuizResultRepository = require('../repositories/QuizResultRepository');

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
const AgentService = require('../services/agentService');
const QuizService = require('../services/quizService');
const QuizResultService = require('../services/quizResultService');
const KnowledgeGapService = require('../services/knowledgeGapService');
const RoadmapService = require('../services/roadmapService');
const CacheService = require('../services/cacheService');
const queueService = require('../services/queueService');
const VectorSearchService = require('../services/vectorSearchService');
const CopilotService = require('../services/copilotService');
const PersonalizedQuizService = require('../services/personalizedQuizService');
const BatchExplanationService = require('../services/batchExplanationService');
const { sendVerificationEmail } = require('../services/emailService');

// Controllers
const AuthController = require('../controllers/authController');
const UserController = require('../controllers/userController');
const SubjectController = require('../controllers/subjectController');
const DocumentController = require('../controllers/documentController');
const ShareController = require('../controllers/shareController');
const ConceptController = require('../controllers/conceptController');
const AgentController = require('../controllers/agentController');
const QuizController = require('../controllers/quizController');
const QuizResultController = require('../controllers/quizResultController');
const KnowledgeGapController = require('../controllers/knowledgeGapController');
const RoadmapController = require('../controllers/roadmapController');
const PersonalReviewController = require('../controllers/personalReviewController');

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

  getSuggestionRepository() {
    if (!this.instances.suggestionRepository) {
      this.instances.suggestionRepository = new SuggestionRepository(this.prisma);
    }
    return this.instances.suggestionRepository;
  }

  getQuizResultRepository() {
    if (!this.instances.quizResultRepository) {
      this.instances.quizResultRepository = new QuizResultRepository();
    }
    return this.instances.quizResultRepository;
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
        this.getConceptRepository(),
        this.getCacheService()
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
        this.getAIService(),
        this.getCacheService(),
        queueService,
        this.getVectorSearchService()
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
        this.getAIService(),
        this.getCacheService()
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
        this.getAIService(),
        this.getVectorSearchService()
      );
    }
    return this.instances.qaService;
  }

  getVectorSearchService() {
    if (!this.instances.vectorSearchService) {
      this.instances.vectorSearchService = new VectorSearchService(
        this.prisma,
        this.getAIService()
      );
    }
    return this.instances.vectorSearchService;
  }

  getUploadService() {
    if (!this.instances.uploadService) {
      this.instances.uploadService = new UploadService();
    }
    return this.instances.uploadService;
  }

  getAgentService() {
    if (!this.instances.agentService) {
      this.instances.agentService = new AgentService(
        this.getSubjectRepository(),
        this.getConceptRepository(),
        this.getAIService(),
        this.getSuggestionRepository()
      );
    }
    return this.instances.agentService;
  }

  getQuizService() {
    if (!this.instances.quizService) {
      this.instances.quizService = new QuizService(
        this.getSubjectRepository(),
        this.getConceptRepository(),
        this.getAIService(),
        this.getCacheService()
      );
    }
    return this.instances.quizService;
  }

  getQuizResultService() {
    if (!this.instances.quizResultService) {
      this.instances.quizResultService = new QuizResultService(
        this.getQuizResultRepository()
      );
    }
    return this.instances.quizResultService;
  }

  getKnowledgeGapService() {
    if (!this.instances.knowledgeGapService) {
      this.instances.knowledgeGapService = new KnowledgeGapService(
        this.getConceptRepository(),
        this.getQuizResultRepository()
      );
    }
    return this.instances.knowledgeGapService;
  }

  getRoadmapService() {
    if (!this.instances.roadmapService) {
      this.instances.roadmapService = new RoadmapService({
        conceptRepository: this.getConceptRepository(),
        quizResultRepository: this.getQuizResultRepository(),
        knowledgeGapService: this.getKnowledgeGapService(),
        cacheService: this.getCacheService()
      });
    }
    return this.instances.roadmapService;
  }

  getCacheService() {
    if (!this.instances.cacheService) {
      this.instances.cacheService = new CacheService();
    }
    return this.instances.cacheService;
  }

  getCopilotService() {
    if (!this.instances.copilotService) {
      this.instances.copilotService = new CopilotService({
        conceptRepository: this.getConceptRepository(),
        quizResultRepository: this.getQuizResultRepository(),
        documentRepository: this.getDocumentRepository(),
        knowledgeGapService: this.getKnowledgeGapService(),
        roadmapService: this.getRoadmapService()
      });
    }
    return this.instances.copilotService;
  }

  getPersonalizedQuizService() {
    if (!this.instances.personalizedQuizService) {
      this.instances.personalizedQuizService = new PersonalizedQuizService({
        knowledgeGapService: this.getKnowledgeGapService(),
        conceptRepository: this.getConceptRepository(),
        quizResultRepository: this.getQuizResultRepository(),
        quizService: this.getQuizService()
      });
    }
    return this.instances.personalizedQuizService;
  }

  getBatchExplanationService() {
    if (!this.instances.batchExplanationService) {
      this.instances.batchExplanationService = new BatchExplanationService({
        aiService: this.getAIService(),
        conceptRepository: this.getConceptRepository()
      });
    }
    return this.instances.batchExplanationService;
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

  getAgentController() {
    return new AgentController(this.getAgentService());
  }

  getQuizController() {
    return QuizController(this.getQuizService());
  }

  getQuizResultController() {
    return new QuizResultController(this.getQuizResultService());
  }

  getKnowledgeGapController() {
    return new KnowledgeGapController(this.getKnowledgeGapService());
  }

  getRoadmapController() {
    return new RoadmapController({
      roadmapService: this.getRoadmapService(),
      copilotService: this.getCopilotService()
    });
  }

  getPersonalReviewController() {
    return new PersonalReviewController({
      personalizedQuizService: this.getPersonalizedQuizService(),
      batchExplanationService: this.getBatchExplanationService()
    });
  }

  /**
   * Clean up
   */
  async destroy() {
    console.log('🧹 Cleaning up DI Container...');
    const { closePrismaClient } = require('../config/database');
    await closePrismaClient();
    if (this.instances.cacheService) {
      await this.instances.cacheService.disconnect();
    }
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
