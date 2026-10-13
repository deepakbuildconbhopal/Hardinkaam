import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  RotateCcw,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AcademyCourse, ProLearningProgress } from '../../types';
import { skillAcademyService } from '../../services/skillAcademyService';

export const SkillAcademyView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { addToast } = useToast();
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProLearningProgress>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
  const [activeQuizCourse, setActiveQuizCourse] = useState<AcademyCourse | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{ passed: boolean; score: number } | null>(null);

  const loadCourses = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const allCourses = await skillAcademyService.getCourses();
      setCourses(allCourses);
      const prog = await skillAcademyService.getProProgress(currentUser.uid);
      setProgressMap(prog);
    } catch (e) {
      console.warn('Error loading academy courses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [currentUser]);

  const handleCompleteModule = async (course: AcademyCourse, moduleId: string) => {
    if (!currentUser) return;
    try {
      const updated = await skillAcademyService.completeModule(
        currentUser.uid,
        userProfile?.name || 'Technician',
        course,
        moduleId
      );
      setProgressMap((prev) => ({ ...prev, [course.id]: updated }));
      addToast('मॉड्यूल पूर्ण हुआ!', 'success');
    } catch (err: any) {
      addToast('मॉड्यूल अपडेट में त्रुटि', 'error');
    }
  };

  const handleStartQuiz = (course: AcademyCourse) => {
    setActiveQuizCourse(course);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuizCourse || !currentUser) return;
    const questions = activeQuizCourse.assessment.questions;
    if (Object.keys(quizAnswers).length < questions.length) {
      addToast('कृपया सभी प्रश्नों के उत्तर दें।', 'warning');
      return;
    }

    setSubmittingQuiz(true);
    try {
      const res = await skillAcademyService.submitAssessment(
        currentUser.uid,
        userProfile?.name || 'Technician',
        activeQuizCourse,
        quizAnswers
      );
      setQuizResult(res);
      await loadCourses();
      if (res.passed) {
        addToast({
          type: 'success',
          title: 'बधाई हो! असेसमेंट उत्तीर्ण!',
          description: `आपने ${res.score}% स्कोर प्राप्त किया और '${activeQuizCourse.badgeName}' स्किल बैज अर्जित किया!`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'असेसमेंट अपूर्ण',
          description: `आपका स्कोर ${res.score}% रहा। पास होने के लिए 75% आवश्यक है। कृपया मॉड्यूल पुनः पढ़ें और प्रयास करें।`,
        });
      }
    } catch (err: any) {
      addToast('क्विज़ सबमिशन में त्रुटि', 'error');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Academy Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-emerald-700/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider">
                सर्विस प्रो कौशल विकास
              </span>
              <span className="text-xs text-emerald-100 font-medium">
                {courses.length} व्यावहारिक पाठ्यक्रम उपलब्ध
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              HARDINKAAM Skill Academy — प्रो ट्रेनिंग एवं बैज
            </h2>
            <p className="text-xs text-white/85">
              उद्योग मानकों के अनुसार सुरक्षा, तकनीकी कौशल व शिष्टाचार सीखें और सत्यापित बैज प्राप्त करें।
            </p>
          </div>
        </div>

        {/* Pro Earned Badges Count */}
        <div className="px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Award className="w-5 h-5 text-amber-300" />
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-100 block">
              अर्जित बैज (Earned Badges)
            </span>
            <span className="text-base font-extrabold text-white">
              {(Object.values(progressMap) as ProLearningProgress[]).filter((p) => p.badgeAwarded).length} / {courses.length}
            </span>
          </div>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="py-12 text-center text-stone-400">
          <GraduationCap className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-xs">पाठ्यक्रम लोड हो रहे हैं...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => {
            const prog = progressMap[course.id];
            const completedCount = prog?.completedModuleIds?.length || 0;
            const totalModules = course.modules.length;
            const progressPercent = Math.round((completedCount / totalModules) * 100);

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {course.categoryName || course.categoryId}
                      </span>
                      <h3 className="font-extrabold text-stone-900 text-sm sm:text-base mt-1">
                        {course.title}
                      </h3>
                      {course.titleEn && (
                        <p className="text-xs text-stone-400 font-medium">{course.titleEn}</p>
                      )}
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-lg shrink-0">
                      {course.badgeIcon || '🎖️'}
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{course.description}</p>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500">
                      <span>प्रगति: {completedCount}/{totalModules} मॉड्यूल</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Badge & Assessment Status */}
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Award className={`w-4 h-4 ${prog?.badgeAwarded ? 'text-amber-500' : 'text-stone-300'}`} />
                      <span className="font-semibold text-stone-800 text-[11px]">
                        {course.badgeName}
                      </span>
                    </div>

                    {prog?.badgeAwarded ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        उत्तीर्ण ({prog.assessmentScore}%)
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">असेसमेंट बाकी</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setActiveCourse(course)}
                    className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>मॉड्यूल पढ़ें ({totalModules})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartQuiz(course)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>क्विज़ टेस्ट दें</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Reader Modal */}
      {activeCourse && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">{activeCourse.title}</h3>
                <p className="text-xs text-stone-500">{activeCourse.titleEn}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {activeCourse.modules.map((mod, idx) => {
                const isCompleted = progressMap[activeCourse.id]?.completedModuleIds?.includes(mod.id);

                return (
                  <div key={mod.id} className="p-4 rounded-2xl border border-stone-200 space-y-3 bg-stone-50/50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        {mod.title}
                      </h4>
                      <span className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{mod.durationMinutes} मिनट
                      </span>
                    </div>

                    <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-line pl-8">
                      {mod.contentMarkdown}
                    </div>

                    <div className="pl-8 pt-2">
                      <span className="font-bold text-[11px] text-stone-800 block mb-1">
                        सुरक्षा चेकलिस्ट (Checklist):
                      </span>
                      <ul className="space-y-1">
                        {mod.checklist.map((item, cIdx) => (
                          <li key={cIdx} className="text-[11px] text-stone-600 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pl-8 pt-2">
                      <button
                        type="button"
                        onClick={() => handleCompleteModule(activeCourse, mod.id)}
                        disabled={isCompleted}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                        }`}
                      >
                        {isCompleted ? '✓ मॉड्यूल पूर्ण' : 'मॉड्यूल पूर्ण चिह्नित करें'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {activeQuizCourse && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  कौशल मूल्यांकन परीक्षा (Skill Assessment)
                </h3>
                <p className="text-xs text-stone-500">{activeQuizCourse.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuizCourse(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {quizResult ? (
                <div className="py-8 text-center space-y-3">
                  <div
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm ${
                      quizResult.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {quizResult.passed ? '🏆' : '⚠️'}
                  </div>
                  <h4 className="font-extrabold text-lg text-stone-900">
                    {quizResult.passed ? 'बधाई! आप उत्तीर्ण हुए!' : 'पुनः प्रयास आवश्यक'}
                  </h4>
                  <p className="text-xs text-stone-600">
                    आपका स्कोर: <strong>{quizResult.score}%</strong> (उत्तीर्ण मानक:{' '}
                    {activeQuizCourse.assessment.passingScore}%)
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveQuizCourse(null)}
                    className="px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-xs"
                  >
                    बंद करें
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-amber-50 rounded-2xl text-xs text-amber-900">
                    प्रत्येक प्रश्न का सही विकल्प चुनें। बैज प्राप्त करने के लिए कम से कम{' '}
                    <strong>{activeQuizCourse.assessment.passingScore}%</strong> अंक आवश्यक हैं।
                  </div>

                  {activeQuizCourse.assessment.questions.map((q, idx) => (
                    <div key={q.id} className="space-y-2">
                      <span className="font-bold text-xs text-stone-900 block">
                        प्रश्न {idx + 1}: {q.question}
                      </span>
                      <div className="space-y-1.5 pl-2">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                              quizAnswers[q.id] === optIdx
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                                : 'border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={quizAnswers[q.id] === optIdx}
                              onChange={() =>
                                setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className="text-emerald-600"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={submittingQuiz}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    {submittingQuiz ? 'मूल्यांकन हो रहा है...' : 'उत्तर सबमिट करें (Submit Assessment)'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
