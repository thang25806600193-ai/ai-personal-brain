import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

/**
 * Notification Center - Hiển thị AI Agent suggestions
 * Nằm ở góc trên phải
 * 🔧 Fixes: Caching suggestions + Debounce API calls + Persist data
 */
function NotificationCenter({ selectedSubject, token, onNotificationApply }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  
  // 🔒 Cache để tránh gọi API liên tục
  const cacheRef = useRef({});
  const cacheKey = (subjectId) => `suggestions_v3_${subjectId}`;
  const loadTimeoutRef = useRef(null);

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  /**
   * Fetch AI suggestions - Gọi đúng 1 lần với debounce
   */
  const loadSuggestions = useCallback(async () => {
    if (!selectedSubject) return;

    // 1️⃣ Kiểm tra cache trước
    if (cacheRef.current[selectedSubject.id]) {
      console.log('✅ Using cached suggestions for', selectedSubject.id);
      setNotifications(cacheRef.current[selectedSubject.id]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Fetching suggestions for subject:', selectedSubject.id);
      const res = await api.post(`/subjects/${selectedSubject.id}/agent/suggestions`);
      
      if (res.data.success && res.data.data.suggestions) {
        const suggestions = res.data.data.suggestions;
        
        // 2️⃣ Cache kết quả
        cacheRef.current[selectedSubject.id] = suggestions;
        
        // 3️⃣ Persist vào localStorage
        localStorage.setItem(
          cacheKey(selectedSubject.id),
          JSON.stringify(suggestions)
        );
        
        setNotifications(suggestions);
        console.log('✅ Loaded', suggestions.length, 'suggestions');
      }
    } catch (error) {
      console.error('Lỗi load suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, api]);

  /**
   * Debounce loadSuggestions - Chỉ gọi khi isOpen và delay 300ms
   */
  useEffect(() => {
    if (!isOpen || !selectedSubject) return;

    // Clear timeout cũ
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Debounce 300ms
    loadTimeoutRef.current = setTimeout(() => {
      loadSuggestions();
    }, 300);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [isOpen, selectedSubject, loadSuggestions]);

  /**
   * Restore suggestions từ localStorage khi component mount
   */
  useEffect(() => {
    if (selectedSubject && !cacheRef.current[selectedSubject.id]) {
      const cached = localStorage.getItem(cacheKey(selectedSubject.id));
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const isValid = Array.isArray(parsed) && parsed.every((s) => s?.issue?.type);
          if (isValid) {
            cacheRef.current[selectedSubject.id] = parsed;
            setNotifications(parsed);
            console.log('📦 Restored from localStorage');
          } else {
            localStorage.removeItem(cacheKey(selectedSubject.id));
          }
        } catch (e) {
          console.error('Parse cache error:', e);
        }
      }
    }
  }, [selectedSubject]);

  /**
   * Chấp thuận suggestion - Memoized
   */
  const handleApply = useCallback(async (suggestion) => {
    try {
      console.log('🎯 handleApply suggestion object:', suggestion);
      console.log('   Keys:', Object.keys(suggestion));
      
      const { conceptId, issue, aiSuggestion } = suggestion;
      const type = issue?.type || suggestion.type; // 🔧 Fix: Get type from issue (fallback to suggestion.type)

      console.log('🎯 Extracted:', { type, conceptId, hasAiSuggestion: !!aiSuggestion });

      let applyData = {};
      
      if (type === 'missing-example' && aiSuggestion.examples) {
        applyData = { examples: aiSuggestion.examples };
      } else if (type === 'short-definition' && aiSuggestion.expandedDefinition) {
        applyData = { expandedDefinition: aiSuggestion.expandedDefinition };
      } else if (type === 'isolated-concept' && aiSuggestion.relatedConcepts) {
        applyData = { relatedConcepts: aiSuggestion.relatedConcepts };
      } else if (type === 'missing-definition' && aiSuggestion.definition) {
        applyData = { definition: aiSuggestion.definition };
      }

      console.log('📤 Sending apply request:', {
        type,
        applyData,
        conceptId
      });

      await api.post(`/subjects/${selectedSubject.id}/agent/apply-suggestion`, {
        suggestionId: suggestion.id,
        conceptId,
        type,
        data: applyData
      });

      // Xóa từ list
      setNotifications(prev => prev.filter(n => n.id !== suggestion.id));
      
      // 🔒 Update cache
      if (cacheRef.current[selectedSubject.id]) {
        cacheRef.current[selectedSubject.id] = cacheRef.current[selectedSubject.id].filter(
          n => n.id !== suggestion.id
        );
        localStorage.setItem(
          cacheKey(selectedSubject.id),
          JSON.stringify(cacheRef.current[selectedSubject.id])
        );
      }
      
      // Callback để reload graph
      if (onNotificationApply) {
        onNotificationApply();
      }

      alert(`✅ Đã cập nhật "${suggestion.term}"`);
    } catch (error) {
      console.error('Lỗi apply:', error);
      alert('Lỗi cập nhật!');
    }
  }, [selectedSubject, api, onNotificationApply]);

  /**
   * Từ chối suggestion - Memoized
   */
  const handleReject = useCallback(async (suggestion) => {
    try {
      await api.post(`/subjects/${selectedSubject.id}/agent/reject-suggestion`, {
        suggestionId: suggestion.id
      });

      // Xóa từ list
      setNotifications(prev => prev.filter(n => n.id !== suggestion.id));
      
      // 🔒 Update cache
      if (cacheRef.current[selectedSubject.id]) {
        cacheRef.current[selectedSubject.id] = cacheRef.current[selectedSubject.id].filter(
          n => n.id !== suggestion.id
        );
        localStorage.setItem(
          cacheKey(selectedSubject.id),
          JSON.stringify(cacheRef.current[selectedSubject.id])
        );
      }

      alert(`👋 Đã từ chối đề xuất cho "${suggestion.term}"`);
    } catch (error) {
      console.error('Lỗi reject:', error);
    }
  }, [selectedSubject, api]);

  /**
   * Render suggestion item
   */
  const renderSuggestionItem = (suggestion) => {
    const isExpanded = expandedSuggestion === suggestion.id;
    
    const typeIcons = {
      'missing-example': '📚',
      'short-definition': '📝',
      'isolated-concept': '🔗',
      'missing-definition': '❓'
    };

    const severityColors = {
      'high': 'border-l-red-500 bg-red-50',
      'medium': 'border-l-yellow-500 bg-yellow-50',
      'low': 'border-l-blue-500 bg-blue-50'
    };

    const icon = typeIcons[suggestion.issue.type] || '💡';
    const color = severityColors[suggestion.issue.severity] || 'border-l-gray-500 bg-gray-50';

    return (
      <div
        key={suggestion.id}
        className={`border-l-4 p-3 mb-2 rounded cursor-pointer transition ${color}`}
        onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{icon}</span>
              <span className="font-semibold text-sm text-gray-800">{suggestion.term}</span>
              <span className="text-xs px-2 py-1 bg-white rounded-full text-gray-600">
                {suggestion.issue.severity === 'high' ? '🔴 Quan trọng' : 
                 suggestion.issue.severity === 'medium' ? '🟡 Trung bình' : 
                 '🔵 Nhỏ'}
              </span>
            </div>
            <p className="text-xs text-gray-700">{suggestion.issue.message}</p>
          </div>
          <span className="text-lg ml-2">{isExpanded ? '▼' : '▶'}</span>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            {/* AI suggestion */}
            {suggestion.aiSuggestion && Object.keys(suggestion.aiSuggestion).length > 0 && (
              <div className="mb-3 p-2 bg-white rounded text-sm">
                <p className="font-semibold text-gray-800 mb-2">💡 Đề xuất từ AI:</p>
                
                {suggestion.aiSuggestion.expandedDefinition && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-700">Định nghĩa mở rộng:</p>
                    <p className="text-xs text-gray-600 italic">{suggestion.aiSuggestion.expandedDefinition}</p>
                  </div>
                )}

                {suggestion.aiSuggestion.examples && Array.isArray(suggestion.aiSuggestion.examples) && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-700">Ví dụ:</p>
                    <ul className="text-xs text-gray-600">
                      {suggestion.aiSuggestion.examples.map((ex, idx) => (
                        <li key={idx} className="ml-4">• {ex}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {suggestion.aiSuggestion.relatedConcepts && Array.isArray(suggestion.aiSuggestion.relatedConcepts) && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-700">Liên kết đề xuất:</p>
                    <ul className="text-xs text-gray-600">
                      {suggestion.aiSuggestion.relatedConcepts.map((rel, idx) => (
                        <li key={idx} className="ml-4">• {rel.name}: {rel.relationship}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {suggestion.aiSuggestion.definition && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-700">Định nghĩa:</p>
                    <p className="text-xs text-gray-600 italic">{suggestion.aiSuggestion.definition}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApply(suggestion);
                }}
                className="flex-1 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition"
              >
                ✅ Chấp thuận
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(suggestion);
                }}
                className="flex-1 px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 transition"
              >
                ❌ Từ chối
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Button toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition ${
          isOpen
            ? 'bg-blue-600 text-white'
            : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
        }`}
        title="Thông báo cải tiến từ AI"
      >
        <span className="text-xl">🤖</span>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {isOpen && (
        <div className="absolute top-16 right-0 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 border-b">
            <h3 className="font-bold text-lg mb-1">🤖 AI Agent Suggestions</h3>
            <p className="text-xs opacity-90">Các đề xuất cải tiến tri thức từ AI</p>
          </div>

          {/* Content */}
          <div className="p-4">
            {!selectedSubject ? (
              <p className="text-sm text-gray-500 text-center py-4">
                👈 Chọn một môn học để xem đề xuất
              </p>
            ) : loading && notifications.length === 0 ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin text-2xl">⏳</div>
                <p className="text-sm text-gray-500 mt-2">Đang phân tích...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">✅ Không có đề xuất nào</p>
                <button
                  onClick={() => {
                    cacheRef.current[selectedSubject.id] = null;
                    loadSuggestions();
                  }}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  🔄 Quét lại
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-600 mb-3">
                  Có <span className="font-bold text-blue-600">{notifications.length}</span> đề xuất cải tiến
                </p>
                {notifications.map(renderSuggestionItem)}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t p-3 bg-gray-50 flex gap-2 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-gray-300 text-gray-800 text-xs rounded hover:bg-gray-400"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  cacheRef.current[selectedSubject.id] = null;
                  loadSuggestions();
                }}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                🔄 Quét lại
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 🔒 Memoize component để tránh re-render không cần thiết
export default React.memo(NotificationCenter);
