const { randomBytes } = require('crypto');
const ValidationException = require('../exceptions/ValidationException');
const ResourceNotFoundException = require('../exceptions/ResourceNotFoundException');

/**
 * Share Service
 * SRP: Xử lý logic chia sẻ (tạo link, verify, lấy graph public)
 */
class ShareService {
  constructor(shareRepository, subjectRepository, subjectService, sharedWithUserRepository, userRepository) {
    this.shareRepository = shareRepository;
    this.subjectRepository = subjectRepository;
    this.subjectService = subjectService;
    this.sharedWithUserRepository = sharedWithUserRepository;
    this.userRepository = userRepository;
  }

  /**
   * Tạo hoặc update share link cho subject
   */
  async createOrUpdateShare(subjectId, shareType) {
    if (!['public', 'private'].includes(shareType)) {
      throw new ValidationException('Share type phải là "public" hoặc "private"', 'shareType');
    }

    // Kiểm tra subject tồn tại
    const subject = await this.subjectRepository.findById(subjectId);
    if (!subject) {
      throw new ResourceNotFoundException('Môn học không tồn tại');
    }

    // Kiểm tra xem đã có share trước đó không
    let share = await this.shareRepository.findBySubjectId(subjectId);

    if (share) {
      // Update share type
      share = await this.shareRepository.update(share.id, { shareType });
    } else {
      // Tạo share mới với token unique
      const token = this._generateToken();
      share = await this.shareRepository.create({
        subjectId,
        shareType,
        token,
      });
    }

    return {
      id: share.id,
      token: share.token,
      shareType: share.shareType,
      link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${share.token}`,
    };
  }

  /**
   * Verify share token và lấy share info
   */
  async verifyToken(token) {
    const share = await this.shareRepository.findByToken(token);
    if (!share) {
      throw new ResourceNotFoundException('Share link không hợp lệ');
    }

    // Nếu là private, chặn truy cập public
    if (share.shareType === 'private') {
      throw new ResourceNotFoundException('Link này đã được đặt ở chế độ riêng tư');
    }

    const subject = await this.subjectRepository.findById(share.subjectId);
    return {
      token: share.token,
      shareType: share.shareType,
      subject: {
        id: subject.id,
        name: subject.name,
        description: subject.description,
        ownerName: subject.user?.name || 'Anonymous',
      },
    };
  }

  /**
   * Lấy graph data cho share (read-only)
   */
  async getSharedGraph(token) {
    const share = await this.shareRepository.findByToken(token);
    if (!share) {
      throw new ResourceNotFoundException('Share link không hợp lệ');
    }

    // Nếu là private, chặn truy cập
    if (share.shareType === 'private') {
      throw new ResourceNotFoundException('Link này đã được đặt ở chế độ riêng tư');
    }

    // Get graph từ subject service (có transform đầy đủ)
    return await this.subjectService.getSubjectGraph(share.subjectId);
  }

  /**
   * Xóa share (owner only, được xử lý ở controller)
   */
  async deleteShare(subjectId) {
    const share = await this.shareRepository.findBySubjectId(subjectId);
    if (share) {
      await this.shareRepository.delete(share.id);
    }
    return { message: 'Đã xóa share' };
  }

  /**
   * Lấy share hiện tại theo subjectId
   */
  async getShareBySubject(subjectId) {
    const share = await this.shareRepository.findBySubjectId(subjectId);
    if (!share) {
      return null;
    }
    return {
      id: share.id,
      token: share.token,
      shareType: share.shareType,
    };
  }

  /**
   * Chia sẻ theo email
   */
  async shareWithEmail(subjectId, email) {
    // Kiểm tra subject tồn tại
    const subject = await this.subjectRepository.findById(subjectId);
    if (!subject) {
      throw new ResourceNotFoundException('Môn học không tồn tại');
    }

    // Kiểm tra email có tồn tại không
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationException('Người này cần đăng ký tài khoản để xem nội dung', 'email');
    }

    // Không cho share với chính mình
    if (user.id === subject.userId) {
      throw new ValidationException('Không thể chia sẻ với chính mình', 'email');
    }

    // Kiểm tra đã share chưa
    const existing = await this.sharedWithUserRepository.findBySubjectAndUser(subjectId, user.id);
    if (existing) {
      return {
        message: 'Đã chia sẻ với người này rồi',
        user: { id: user.id, name: user.name, email: user.email }
      };
    }

    // Tạo share mới
    await this.sharedWithUserRepository.create({
      subjectId,
      userId: user.id,
      permission: 'view'
    });

    return {
      message: 'Chia sẻ thành công',
      user: { id: user.id, name: user.name, email: user.email }
    };
  }

  /**
   * Lấy danh sách người được share
   */
  async getSharedUsers(subjectId) {
    return await this.sharedWithUserRepository.findBySubject(subjectId);
  }

  /**
   * Lấy danh sách subject được share với user (exclude subjects mà user là owner)
   */
  async getSharedWithMe(userId) {
    const shares = await this.sharedWithUserRepository.findByUser(userId);
    // Filter out subjects where user is the owner
    return shares.filter(share => share.subject.userId !== userId);
  }

  /**
   * Xóa share với 1 user
   */
  async removeSharedUser(subjectId, userId) {
    await this.sharedWithUserRepository.deleteBySubjectAndUser(subjectId, userId);
    return { message: 'Đã xóa quyền chia sẻ' };
  }

  /**
   * Validate nếu user có quyền truy cập shared subject
   * Returns { canAccess, isOwner }
   */
  async validateSubjectAccess(subjectId, userId) {
    const subject = await this.subjectRepository.findById(subjectId);
    if (!subject) {
      throw new ResourceNotFoundException('Môn học không tồn tại');
    }

    // Chủ sở hữu luôn có quyền
    if (subject.userId === userId) {
      return { canAccess: true, isOwner: true };
    }

    // Kiểm tra xem user có được share không
    const shared = await this.sharedWithUserRepository.findBySubjectAndUser(subjectId, userId);
    if (shared) {
      return { canAccess: true, isOwner: false };
    }

    return { canAccess: false, isOwner: false };
  }

  /**
   * Private: Generate unique token
   */
  _generateToken() {
    return randomBytes(12).toString('hex');
  }
}

module.exports = ShareService;
