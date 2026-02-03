/**
 * Concept Controller - Handler cho concept routes
 * SRP: Chỉ xử lý request/response
 * DIP: Nhận ConceptService qua constructor
 */

const ConceptController = (conceptService) => {
  return {
    /**
     * POST /api/concepts/suggest-links
     */
    suggestLinks: async (req, res, next) => {
      try {
        const { subjectId, noteText, threshold, limit } = req.body;
        const result = await conceptService.suggestLinks(subjectId, noteText, {
          threshold,
          limit,
        });
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /api/concepts/manual
     */
    createManualConcept: async (req, res, next) => {
      try {
        const { subjectId, ...data } = req.body;
        const result = await conceptService.createManualConcept(subjectId, data);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * DELETE /api/concepts/:conceptId
     */
    deleteConcept: async (req, res, next) => {
      try {
        const { conceptId } = req.params;
        const result = await conceptService.deleteConcept(conceptId);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /api/concepts/delete-by-term
     */
    deleteConceptByTerm: async (req, res, next) => {
      try {
        const { subjectId, term } = req.body;
        const result = await conceptService.deleteConceptByTerm(subjectId, term);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /api/concepts/search
     */
    searchConcepts: async (req, res, next) => {
      try {
        const { subjectId, term } = req.body;
        const results = await conceptService.searchConceptsByTerm(term, subjectId);
        res.json(results);
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /api/concepts/update-by-term
     */
    updateConceptByTerm: async (req, res, next) => {
      try {
        const { subjectId, currentTerm, newTerm, definition, example } = req.body;
        const result = await conceptService.updateConceptByTerm(subjectId, currentTerm, {
          newTerm,
          definition,
          example,
        });
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  };
};

module.exports = ConceptController;
