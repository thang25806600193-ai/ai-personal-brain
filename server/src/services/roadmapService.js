class RoadmapService {
  constructor({ conceptRepository, quizResultRepository, knowledgeGapService }) {
    this.conceptRepository = conceptRepository;
    this.quizResultRepository = quizResultRepository;
    this.knowledgeGapService = knowledgeGapService;
  }

  /**
   * Generate personalized learning roadmap for a subject
   * @param {number} userId
   * @param {number} subjectId
   * @returns {Object} Roadmap with weekly schedule and learning path
   */
  async generateRoadmap(userId, subjectId) {
    // Step 1: Get all concepts and knowledge gaps
    const concepts = await this.conceptRepository.findBySubjectId(subjectId);
    const knowledgeGaps = await this.knowledgeGapService.analyzeSubject(userId, subjectId);

    // Step 2: Build dependency graph
    const dependencyGraph = this._buildDependencyGraph(concepts);

    // Step 3: Identify foundational concepts
    const foundationalConcepts = this._identifyFoundationalConcepts(dependencyGraph);

    // Step 4: Sort concepts by learning order (topological sort)
    const learningPath = this._generateLearningPath(dependencyGraph, foundationalConcepts, knowledgeGaps);

    // Step 5: Create weekly schedule
    const weeklySchedule = this._createWeeklySchedule(learningPath, knowledgeGaps);

    return {
      subjectId,
      totalConcepts: concepts.length,
      foundationalConcepts: foundationalConcepts.map(c => c.title),
      learningPath,
      weeklySchedule,
      estimatedWeeks: weeklySchedule.length,
      generatedAt: new Date()
    };
  }

  /**
   * Build dependency graph from concept links
   */
  _buildDependencyGraph(concepts) {
    const graph = new Map();

    concepts.forEach(concept => {
      if (!graph.has(concept.id)) {
        graph.set(concept.id, {
          concept,
          prerequisites: [], // concepts that must be learned first
          dependents: [], // concepts that depend on this
          level: 0 // depth in dependency tree
        });
      }
    });

    // Build relationships from links
    concepts.forEach(concept => {
      if (concept.links && Array.isArray(concept.links)) {
        concept.links.forEach(link => {
          const targetNode = graph.get(link.targetId);
          const sourceNode = graph.get(concept.id);

          if (targetNode && sourceNode) {
            // If this concept links to another, that other is a prerequisite
            sourceNode.prerequisites.push(link.targetId);
            targetNode.dependents.push(concept.id);
          }
        });
      }
    });

    return graph;
  }

  /**
   * Identify foundational concepts (few or no prerequisites)
   */
  _identifyFoundationalConcepts(graph) {
    const foundational = [];

    graph.forEach((node, id) => {
      if (node.prerequisites.length === 0) {
        foundational.push(node.concept);
      }
    });

    // If no concepts have zero prerequisites, pick those with fewest
    if (foundational.length === 0) {
      const minPrereqs = Math.min(...Array.from(graph.values()).map(n => n.prerequisites.length));
      graph.forEach((node, id) => {
        if (node.prerequisites.length === minPrereqs) {
          foundational.push(node.concept);
        }
      });
    }

    return foundational;
  }

  /**
   * Generate learning path using topological sort + knowledge gap priority
   */
  _generateLearningPath(graph, foundationalConcepts, knowledgeGaps) {
    const learningPath = [];
    const visited = new Set();
    const inProgress = new Set();

    // Map knowledge gaps by concept ID
    const gapMap = new Map();
    ['strong', 'medium', 'weak'].forEach(category => {
      knowledgeGaps[category]?.forEach(gap => {
        gapMap.set(gap.conceptId, { ...gap, category });
      });
    });

    // DFS with priority for weak concepts
    const dfs = (conceptId) => {
      if (visited.has(conceptId)) return;
      if (inProgress.has(conceptId)) return; // cycle detection

      inProgress.add(conceptId);
      const node = graph.get(conceptId);

      if (!node) {
        inProgress.delete(conceptId);
        return;
      }

      // Visit prerequisites first
      node.prerequisites.forEach(prereqId => {
        dfs(prereqId);
      });

      // Add to learning path
      if (!visited.has(conceptId)) {
        const gapInfo = gapMap.get(conceptId) || { category: 'unknown', score: 60 };
        learningPath.push({
          conceptId: node.concept.id,
          title: node.concept.title,
          definition: node.concept.definition,
          priority: gapInfo.category === 'weak' ? 'high' : gapInfo.category === 'medium' ? 'medium' : 'low',
          score: gapInfo.score,
          prerequisiteCount: node.prerequisites.length,
          dependentCount: node.dependents.length
        });
        visited.add(conceptId);
      }

      inProgress.delete(conceptId);
    };

    // Start with weak concepts and their prerequisites
    const weakConcepts = knowledgeGaps.weak || [];
    weakConcepts.forEach(weak => {
      dfs(weak.conceptId);
    });

    // Then medium concepts
    const mediumConcepts = knowledgeGaps.medium || [];
    mediumConcepts.forEach(medium => {
      dfs(medium.conceptId);
    });

    // Finally, remaining concepts
    graph.forEach((node, id) => {
      dfs(id);
    });

    return learningPath;
  }

  /**
   * Create weekly schedule from learning path
   */
  _createWeeklySchedule(learningPath, knowledgeGaps) {
    const schedule = [];
    const conceptsPerWeek = 3; // Configurable
    let weekNumber = 1;

    for (let i = 0; i < learningPath.length; i += conceptsPerWeek) {
      const weekConcepts = learningPath.slice(i, i + conceptsPerWeek);
      
      schedule.push({
        weekNumber,
        title: `Tuần ${weekNumber}`,
        concepts: weekConcepts.map(c => ({
          id: c.conceptId,
          title: c.title,
          priority: c.priority,
          score: c.score,
          status: 'pending' // pending, in-progress, completed
        })),
        focus: this._determineWeekFocus(weekConcepts),
        estimatedHours: weekConcepts.length * 2 // 2 hours per concept
      });

      weekNumber++;
    }

    return schedule;
  }

  /**
   * Determine main focus of the week
   */
  _determineWeekFocus(weekConcepts) {
    const highPriority = weekConcepts.filter(c => c.priority === 'high');
    if (highPriority.length > 0) {
      return `Ôn tập và củng cố: ${highPriority.map(c => c.title).join(', ')}`;
    }

    const titles = weekConcepts.map(c => c.title);
    if (titles.length === 1) {
      return `Học: ${titles[0]}`;
    }
    return `Học: ${titles.slice(0, 2).join(', ')}${titles.length > 2 ? ',...' : ''}`;
  }

  /**
   * Get next recommended concepts to study
   * @param {number} userId
   * @param {number} subjectId
   * @param {number} limit
   * @returns {Array} Recommended concepts
   */
  async getNextRecommendations(userId, subjectId, limit = 5) {
    const roadmap = await this.generateRoadmap(userId, subjectId);
    
    // Get concepts with high priority that haven't been mastered
    const recommendations = roadmap.learningPath
      .filter(c => c.priority === 'high' || c.priority === 'medium')
      .slice(0, limit)
      .map(c => ({
        ...c,
        reason: this._getRecommendationReason(c)
      }));

    return recommendations;
  }

  /**
   * Get recommendation reason
   */
  _getRecommendationReason(concept) {
    if (concept.priority === 'high') {
      if (concept.score < 40) {
        return 'Kiến thức còn yếu, cần ôn tập gấp';
      }
      return 'Cần củng cố để nắm vững';
    }
    
    if (concept.prerequisiteCount === 0) {
      return 'Kiến thức nền tảng';
    }

    if (concept.dependentCount > 3) {
      return 'Kiến thức quan trọng, liên kết nhiều concept khác';
    }

    return 'Tiếp theo trong lộ trình học';
  }
}

module.exports = RoadmapService;
