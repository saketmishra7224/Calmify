import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  ClipboardList, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  Download,
  AlertTriangle,
  Info,
  Heart,
  Brain,
  MessageCircle,
  RefreshCw
} from "lucide-react";

// Questionnaire definitions
const questionnaires = {
  'GAD-7': {
    title: 'GAD-7 (Generalized Anxiety Disorder Assessment)',
    description: 'This questionnaire measures symptoms of generalized anxiety disorder.',
    questions: [
      'Feeling nervous, anxious, or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid, as if something awful might happen'
    ],
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ],
    timeframe: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
    scoring: {
      thresholds: [
        { min: 0, max: 4, level: 'Minimal', description: 'Minimal anxiety', color: 'text-green-600' },
        { min: 5, max: 9, level: 'Mild', description: 'Mild anxiety', color: 'text-yellow-600' },
        { min: 10, max: 14, level: 'Moderate', description: 'Moderate anxiety', color: 'text-orange-600' },
        { min: 15, max: 21, level: 'Severe', description: 'Severe anxiety', color: 'text-red-600' }
      ]
    }
  },
  'PHQ-9': {
    title: 'PHQ-9 (Patient Health Questionnaire for Depression)',
    description: 'This questionnaire measures symptoms of depression.',
    questions: [
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep, or sleeping too much',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself or that you are a failure or have let yourself or your family down',
      'Trouble concentrating on things, such as reading the newspaper or watching television',
      'Moving or speaking so slowly that other people could have noticed. Or the opposite being so fidgety or restless that you have been moving around a lot more than usual',
      'Thoughts that you would be better off dead, or of hurting yourself'
    ],
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ],
    timeframe: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
    scoring: {
      thresholds: [
        { min: 0, max: 4, level: 'Minimal', description: 'Minimal depression', color: 'text-green-600' },
        { min: 5, max: 9, level: 'Mild', description: 'Mild depression', color: 'text-yellow-600' },
        { min: 10, max: 14, level: 'Moderate', description: 'Moderate depression', color: 'text-orange-600' },
        { min: 15, max: 19, level: 'Moderately severe', description: 'Moderately severe depression', color: 'text-red-600' },
        { min: 20, max: 27, level: 'Severe', description: 'Severe depression', color: 'text-red-800' }
      ]
    }
  },
  'GHQ-12': {
    title: 'GHQ-12 (General Health Questionnaire)',
    description: 'This questionnaire measures general psychological distress and wellbeing.',
    questions: [
      'Been able to concentrate on whatever you\'re doing?',
      'Lost much sleep over worry?',
      'Felt that you were playing a useful part in things?',
      'Felt capable of making decisions about things?',
      'Felt constantly under strain?',
      'Felt you couldn\'t overcome your difficulties?',
      'Been able to enjoy your normal day-to-day activities?',
      'Been able to face up to problems?',
      'Been feeling unhappy or depressed?',
      'Been losing confidence in yourself?',
      'Been thinking of yourself as a worthless person?',
      'Been feeling reasonably happy, all things considered?'
    ],
    options: [
      { value: 0, text: 'Better than usual' },
      { value: 1, text: 'Same as usual' },
      { value: 2, text: 'Less than usual' },
      { value: 3, text: 'Much less than usual' }
    ],
    timeframe: 'Have you recently:',
    scoring: {
      method: 'Likert scoring (0-3)',
      thresholds: [
        { min: 0, max: 11, level: 'Good', description: 'Good mental health', color: 'text-green-600' },
        { min: 12, max: 15, level: 'Mild distress', description: 'Mild psychological distress', color: 'text-yellow-600' },
        { min: 16, max: 20, level: 'Moderate distress', description: 'Moderate psychological distress', color: 'text-orange-600' },
        { min: 21, max: 36, level: 'Severe distress', description: 'Severe psychological distress', color: 'text-red-600' }
      ]
    }
  }
};

const impactQuestion = {
  text: 'If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?',
  options: [
    { value: 0, text: 'Not difficult at all' },
    { value: 1, text: 'Somewhat difficult' },
    { value: 2, text: 'Very difficult' },
    { value: 3, text: 'Extremely difficult' }
  ]
};

export default function AssessmentPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [currentSection, setCurrentSection] = useState<'intro' | 'GAD-7' | 'PHQ-9' | 'GHQ-12' | 'impact' | 'results' | 'existing'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<number, number>>>({
    'GAD-7': {},
    'PHQ-9': {},
    'GHQ-12': {}
  });
  const [impactAnswer, setImpactAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [existingAssessment, setExistingAssessment] = useState<any>(null);
  const [hasExistingAssessment, setHasExistingAssessment] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [assessmentStartTime, setAssessmentStartTime] = useState<Date>(new Date());

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (isLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if user is a patient (only patients can access assessments)
    if (user?.role && !['patient', 'student'].includes(user.role)) {
      navigate('/dashboard');
      return;
    }

    // Check for existing assessment
    checkForExistingAssessment();
  }, [isAuthenticated, user, navigate, isLoading]);

  // Also check when the component mounts or when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && user?.role && ['patient', 'student'].includes(user.role)) {
        checkForExistingAssessment();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && user?.role && ['patient', 'student'].includes(user.role)) {
        checkForExistingAssessment();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, user]);

  const checkForExistingAssessment = async () => {
    try {
      setCheckingExisting(true);
      console.log('Checking for existing assessment...');
      const response = await apiService.getLatestAssessment();
      console.log('Assessment check response:', response);
      
      if (response.success && response.data?.hasAssessment) {
        console.log('Found existing assessment:', response.data.assessment);
        setExistingAssessment(response.data.assessment);
        setHasExistingAssessment(true);
        setCurrentSection('existing');
      } else {
        console.log('No existing assessment found');
        setHasExistingAssessment(false);
        setCurrentSection('intro'); // Explicitly set to intro if no existing assessment
      }
    } catch (error) {
      console.error('Error checking for existing assessment:', error);
      setHasExistingAssessment(false);
      setCurrentSection('intro'); // Explicitly set to intro on error
    } finally {
      setCheckingExisting(false);
    }
  };

  const calculateScore = (questionnaireType: keyof typeof questionnaires, questionnaireAnswers: Record<number, number>) => {
    const questions = questionnaires[questionnaireType].questions;
    let total = 0;
    
    for (let i = 1; i <= questions.length; i++) {
      total += questionnaireAnswers[i] || 0;
    }
    
    return total;
  };

  const getSeverityLevel = (questionnaireType: keyof typeof questionnaires, score: number) => {
    const thresholds = questionnaires[questionnaireType].scoring.thresholds;
    for (const threshold of thresholds) {
      if (score >= threshold.min && score <= threshold.max) {
        return threshold;
      }
    }
    return thresholds[thresholds.length - 1];
  };

  const handleAnswerChange = (value: string) => {
    const answerValue = parseInt(value);
    const questionNumber = currentQuestion + 1;
    
    if (currentSection === 'impact') {
      setImpactAnswer(answerValue);
      return;
    }
    
    setAnswers(prev => ({
      ...prev,
      [currentSection]: {
        ...prev[currentSection],
        [questionNumber]: answerValue
      }
    }));
  };

  const getCurrentQuestionnaireQuestions = () => {
    if (currentSection === 'impact') return [impactQuestion];
    if (currentSection in questionnaires) {
      return questionnaires[currentSection as keyof typeof questionnaires].questions.map((text, index) => ({
        number: index + 1,
        text
      }));
    }
    return [];
  };

  const getCurrentQuestionnaireOptions = () => {
    if (currentSection === 'impact') return impactQuestion.options;
    if (currentSection in questionnaires) {
      return questionnaires[currentSection as keyof typeof questionnaires].options;
    }
    return [];
  };

  const getCurrentAnswer = () => {
    if (currentSection === 'impact') return impactAnswer;
    if (currentSection in questionnaires) {
      return answers[currentSection]?.[currentQuestion + 1];
    }
    return undefined;
  };

  const getProgress = () => {
    const sections = ['GAD-7', 'PHQ-9', 'GHQ-12', 'impact'];
    const sectionIndex = sections.indexOf(currentSection);
    if (sectionIndex === -1) return 0;
    
    let totalQuestions = 0;
    let answeredQuestions = 0;
    
    sections.forEach((section, index) => {
      if (section === 'impact') {
        totalQuestions += 1;
        if (impactAnswer !== null) answeredQuestions += 1;
      } else if (section in questionnaires) {
        const questionnaire = questionnaires[section as keyof typeof questionnaires];
        totalQuestions += questionnaire.questions.length;
        const sectionAnswers = answers[section] || {};
        answeredQuestions += Object.keys(sectionAnswers).length;
      }
    });
    
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const handleNext = () => {
    const questions = getCurrentQuestionnaireQuestions();
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Move to next section
      const sections = ['GAD-7', 'PHQ-9', 'GHQ-12', 'impact'];
      const currentIndex = sections.indexOf(currentSection);
      
      if (currentIndex < sections.length - 1) {
        setCurrentSection(sections[currentIndex + 1] as any);
        setCurrentQuestion(0);
      } else {
        calculateResults();
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    } else {
      // Move to previous section
      const sections = ['GAD-7', 'PHQ-9', 'GHQ-12', 'impact'];
      const currentIndex = sections.indexOf(currentSection);
      
      if (currentIndex > 0) {
        const prevSection = sections[currentIndex - 1];
        setCurrentSection(prevSection as any);
        
        if (prevSection === 'impact') {
          setCurrentQuestion(0);
        } else if (prevSection in questionnaires) {
          const questionnaire = questionnaires[prevSection as keyof typeof questionnaires];
          setCurrentQuestion(questionnaire.questions.length - 1);
        }
      }
    }
  };

  const calculateResults = async () => {
    setLoading(true);
    
    try {
      const results: any = {
        scores: {},
        interpretations: {},
        overallSeverity: 'minimal',
        recommendations: [],
        impactLevel: impactAnswer
      };

      let maxSeverityLevel = 0;
      const severityLevels = ['Minimal', 'Mild', 'Moderate', 'Moderately severe', 'Severe'];

      // Calculate scores for each questionnaire
      Object.keys(questionnaires).forEach(type => {
        const questionnaireType = type as keyof typeof questionnaires;
        const score = calculateScore(questionnaireType, answers[type] || {});
        const interpretation = getSeverityLevel(questionnaireType, score);
        
        results.scores[type] = score;
        results.interpretations[type] = interpretation;
        
        const severityIndex = severityLevels.indexOf(interpretation.level);
        if (severityIndex > maxSeverityLevel) {
          maxSeverityLevel = severityIndex;
          results.overallSeverity = interpretation.level.toLowerCase();
        }
      });

      // Generate recommendations
      if (maxSeverityLevel >= 2) { // Moderate or higher
        results.recommendations.push('Consider speaking with a mental health professional');
        results.recommendations.push('Practice stress management techniques like meditation or deep breathing');
        results.recommendations.push('Maintain regular sleep schedule and physical activity');
      }
      
      if (maxSeverityLevel >= 3) { // Moderately severe or higher
        results.recommendations.push('Seek professional counseling or therapy');
        results.recommendations.push('Consider contacting a crisis helpline if needed');
      }

      if (impactAnswer && impactAnswer >= 2) {
        results.recommendations.push('Focus on functional improvement and daily activity management');
      }

      setResults(results);

      // Save assessment to database
      await saveAssessmentToDatabase(results);
      
      setCurrentSection('results');
    } catch (error) {
      console.error('Error calculating or saving results:', error);
      // Still show results even if save failed
      setCurrentSection('results');
    } finally {
      setLoading(false);
    }
  };

  const saveAssessmentToDatabase = async (calculatedResults: any) => {
    try {
      setSubmittingAssessment(true);

      // Prepare questionnaire data for submission
      const questionnaireData: any = {};
      Object.keys(questionnaires).forEach(type => {
        const questionnaireType = type as keyof typeof questionnaires;
        const questionnaire = questionnaires[questionnaireType];
        const score = calculatedResults.scores[type];
        const interpretation = calculatedResults.interpretations[type];

        // Convert answers to questions format
        const questions = questionnaire.questions.map((questionText, index) => ({
          questionNumber: index + 1,
          questionText,
          selectedValue: answers[type]?.[index + 1] || 0,
          selectedText: questionnaire.options[answers[type]?.[index + 1] || 0]?.text || ''
        }));

        questionnaireData[type] = {
          type,
          questions,
          totalScore: score,
          maxPossibleScore: questionnaire.questions.length * 3,
          severityLevel: interpretation
        };
      });

      // Prepare functional impact data
      const functionalImpactData = {
        questionText: impactQuestion.text,
        selectedValue: impactAnswer || 0,
        selectedText: impactQuestion.options[impactAnswer || 0]?.text || ''
      };

      // Determine max severity questionnaire
      let maxSeverityQuestionnaire = 'GAD-7';
      let maxSeverityValue = 0;
      Object.keys(calculatedResults.scores).forEach(type => {
        const score = calculatedResults.scores[type];
        if (score > maxSeverityValue) {
          maxSeverityValue = score;
          maxSeverityQuestionnaire = type;
        }
      });

      // Prepare overall results
      const overallResults = {
        overallSeverity: calculatedResults.overallSeverity,
        maxSeverityQuestionnaire,
        recommendations: calculatedResults.recommendations,
        riskFlags: []
      };

      // Calculate time to complete
      const timeToComplete = Math.round((new Date().getTime() - assessmentStartTime.getTime()) / 1000);

      // Submit to API
      const assessmentData = {
        questionnaires: questionnaireData,
        functionalImpact: functionalImpactData,
        overallResults,
        timeToComplete,
        startedAt: assessmentStartTime.toISOString(),
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        notes: 'Comprehensive mental health assessment'
      };

      const response = await apiService.submitAssessment(assessmentData);
      
      if (response.success) {
        console.log('Assessment saved successfully:', response.data);
        // Update results with database response data
        setResults({
          ...calculatedResults,
          sessionId: response.data.assessment.sessionId,
          savedToDatabase: true
        });
        
        // Update the existing assessment data so user sees the latest result
        setExistingAssessment(response.data.assessment);
        setHasExistingAssessment(true);
        
        // Refresh the assessment status to ensure proper state
        await checkForExistingAssessment();
      } else {
        console.error('Failed to save assessment:', response.error);
      }
    } catch (error) {
      console.error('Error saving assessment to database:', error);
      // Continue even if database save fails
    } finally {
      setSubmittingAssessment(false);
    }
  };

  const downloadPDF = () => {
    // Create PDF content
    const pdfContent = `
Mental Health Assessment Report
Generated on: ${new Date().toLocaleDateString()}

ASSESSMENT SCORES:
${Object.keys(questionnaires).map(type => {
  const score = results.scores[type];
  const interpretation = results.interpretations[type];
  return `${type}: ${score}/21 - ${interpretation.description}`;
}).join('\n')}

FUNCTIONAL IMPACT:
${impactAnswer !== null ? impactQuestion.options[impactAnswer].text : 'Not assessed'}

RECOMMENDATIONS:
${results.recommendations.map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n')}

IMPORTANT NOTE:
This assessment is for informational purposes only and should not replace professional medical advice.
If you are experiencing thoughts of self-harm or suicide, please contact emergency services immediately.
    `;

    // Create and download PDF (simplified version - in real app, use a proper PDF library)
    const element = document.createElement('a');
    const file = new Blob([pdfContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `mental-health-assessment-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isAuthenticated || (user?.role && !['patient', 'student'].includes(user.role))) {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Mental health assessments are only available to patients.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/dashboard')} className="mt-4" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  if (checkingExisting) {
    return (
      <Layout >
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Checking for existing assessment...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (currentSection === 'existing' && hasExistingAssessment && existingAssessment) {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <ClipboardList className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl">Previous Assessment Found</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You completed an assessment on{' '}
                  <strong>{new Date(existingAssessment.completedAt).toLocaleDateString()}</strong>.
                  Would you like to view your previous results or take a new assessment?
                </AlertDescription>
              </Alert>

              {/* Refresh button for checking latest assessment */}
              <div className="flex justify-center">
                <Button 
                  onClick={checkForExistingAssessment} 
                  variant="ghost" 
                  size="sm"
                  disabled={checkingExisting}
                  className="text-muted-foreground"
                >
                  {checkingExisting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh Assessment Status
                </Button>
              </div>

              <div className="grid gap-4">
                {Object.keys(existingAssessment.questionnaires).map(type => {
                  const questionnaire = existingAssessment.questionnaires[type];
                  return (
                    <Card key={type} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">{type}</h3>
                          <span className={`text-lg font-bold ${questionnaire.severityLevel.color}`}>
                            {questionnaire.totalScore}/{questionnaire.maxPossibleScore}
                          </span>
                        </div>
                        <p className={`text-sm ${questionnaire.severityLevel.color}`}>
                          {questionnaire.severityLevel.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  onClick={() => {
                    setResults({
                      scores: Object.keys(existingAssessment.questionnaires).reduce((acc: any, type) => {
                        acc[type] = existingAssessment.questionnaires[type].totalScore;
                        return acc;
                      }, {}),
                      interpretations: Object.keys(existingAssessment.questionnaires).reduce((acc: any, type) => {
                        acc[type] = existingAssessment.questionnaires[type].severityLevel;
                        return acc;
                      }, {}),
                      overallSeverity: existingAssessment.overallResults.overallSeverity,
                      recommendations: existingAssessment.overallResults.recommendations,
                      impactLevel: existingAssessment.functionalImpact.selectedValue,
                      sessionId: existingAssessment.sessionId,
                      savedToDatabase: true,
                      isExistingResults: true
                    });
                    setImpactAnswer(existingAssessment.functionalImpact.selectedValue);
                    setCurrentSection('results');
                  }}
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  View Previous Results
                </Button>
                <Button 
                  onClick={() => {
                    setAssessmentStartTime(new Date());
                    setCurrentSection('intro');
                    setHasExistingAssessment(false);
                    setExistingAssessment(null);
                    // Reset all answers
                    setAnswers({
                      'GAD-7': {},
                      'PHQ-9': {},
                      'GHQ-12': {}
                    });
                    setImpactAnswer(null);
                    setResults(null);
                  }}
                  variant="outline"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Take New Assessment
                </Button>
                <Button onClick={() => navigate('/dashboard')} variant="ghost">
                  Return Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (currentSection === 'intro') {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Brain className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl">Mental Health Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-lg text-muted-foreground mb-6">
                  This comprehensive assessment includes three standardized questionnaires to evaluate your mental health and wellbeing.
                </p>
              </div>

              <div className="grid gap-4">
                {Object.entries(questionnaires).map(([key, questionnaire]) => (
                  <Card key={key} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{questionnaire.title}</h3>
                      <p className="text-sm text-muted-foreground">{questionnaire.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {questionnaire.questions.length} questions
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This assessment takes approximately 10-15 minutes to complete. 
                  Your responses are confidential and will help us provide personalized support recommendations.
                  This assessment is not a substitute for professional medical diagnosis.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button 
                  onClick={() => {
                    setAssessmentStartTime(new Date());
                    setCurrentSection('GAD-7');
                  }} 
                  size="lg"
                >
                  Start Assessment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (currentSection === 'results') {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <CardTitle className="text-2xl">Assessment Complete</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">Your Results</h3>
                </div>

                {/* Individual questionnaire results */}
                <div className="grid gap-4">
                  {Object.keys(questionnaires).map(type => {
                    const score = results.scores[type];
                    const interpretation = results.interpretations[type];
                    const maxScore = questionnaires[type as keyof typeof questionnaires].questions.length * 3;
                    
                    return (
                      <Card key={type} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{type}</h4>
                            <span className={`text-lg font-bold ${interpretation.color}`}>
                              {score}/{maxScore}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`font-medium ${interpretation.color}`}>
                              {interpretation.description}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {interpretation.level}
                            </span>
                          </div>
                          <Progress 
                            value={(score / maxScore) * 100} 
                            className="mt-2"
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Functional impact */}
                {impactAnswer !== null && (
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Functional Impact</h4>
                      <p className="text-sm">
                        Daily functioning difficulty: <strong>{impactQuestion.options[impactAnswer].text}</strong>
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {results.recommendations.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {results.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Crisis alert */}
                {results.overallSeverity === 'severe' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Your responses indicate you may be experiencing significant distress. 
                      Please consider reaching out to a mental health professional or crisis support service immediately.
                      If you're having thoughts of self-harm, please contact emergency services or a crisis hotline.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap justify-center gap-4">
                <Button onClick={downloadPDF} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button onClick={() => navigate('/chatbot')}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Talk to AI Assistant
                </Button>
                {['moderate', 'moderately severe', 'severe'].includes(results.overallSeverity) && (
                  <Button onClick={() => navigate('/peer/available')} variant="default">
                    <Heart className="h-4 w-4 mr-2" />
                    Connect with Support
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    setAssessmentStartTime(new Date());
                    setCurrentSection('intro');
                    setResults(null);
                    setAnswers({
                      'GAD-7': {},
                      'PHQ-9': {},
                      'GHQ-12': {}
                    });
                    setImpactAnswer(null);
                  }} 
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Take New Assessment
                </Button>
                <Button onClick={() => navigate('/dashboard')} variant="ghost">
                  Return Home
                </Button>
              </div>

              {results.savedToDatabase && !results.isExistingResults && (
                <div className="text-center">
                  <Alert className="max-w-md mx-auto">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your assessment has been securely saved to your account.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {results.isExistingResults && (
                <div className="text-center">
                  <Alert className="max-w-md mx-auto">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Showing results from your assessment on{' '}
                      {existingAssessment && new Date(existingAssessment.completedAt).toLocaleDateString()}.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="text-center text-xs text-muted-foreground">
                <p>
                  This assessment is for informational purposes only and should not replace professional medical advice.
                  Always consult with a qualified healthcare provider for proper diagnosis and treatment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout >
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-lg">Calculating your results...</span>
            {submittingAssessment && (
              <span className="text-sm text-muted-foreground">Saving to database...</span>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Current questionnaire view
  const questions = getCurrentQuestionnaireQuestions();
  const options = getCurrentQuestionnaireOptions();
  const currentAnswer = getCurrentAnswer();
  const isLastQuestion = currentQuestion === questions.length - 1;
  const sections = ['GAD-7', 'PHQ-9', 'GHQ-12', 'impact'];
  const isLastSection = currentSection === 'impact';

  const currentQuestionText = currentSection === 'impact' 
    ? impactQuestion.text 
    : questions[currentQuestion]?.text;

  const timeframe = currentSection === 'impact' 
    ? ''
    : questionnaires[currentSection as keyof typeof questionnaires]?.timeframe;

  return (
    <Layout >
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-6 w-6 text-primary" />
              <CardTitle>
                {currentSection === 'impact' 
                  ? 'Functional Impact Assessment'
                  : questionnaires[currentSection as keyof typeof questionnaires]?.title
                }
              </CardTitle>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {currentSection === 'impact' 
                    ? 'Impact Question'
                    : `Question ${currentQuestion + 1} of ${questions.length}`
                  }
                </span>
                <span>{getProgress()}% Complete</span>
              </div>
              <Progress value={getProgress()} className="w-full" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              {timeframe && (
                <p className="text-sm text-muted-foreground italic">{timeframe}</p>
              )}
              
              <h3 className="text-lg font-medium">
                {currentQuestionText}
              </h3>

              <RadioGroup
                value={currentAnswer?.toString() || ''}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                {options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option.value.toString()} 
                      id={`option-${option.value}`}
                    />
                    <Label 
                      htmlFor={`option-${option.value}`}
                      className="flex-1 cursor-pointer"
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={handlePrevious}
                disabled={currentSection === 'GAD-7' && currentQuestion === 0}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {isLastQuestion && isLastSection ? (
                <Button
                  onClick={calculateResults}
                  disabled={currentAnswer === undefined}
                >
                  Calculate Results
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentAnswer === undefined}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>All responses are confidential and will help provide personalized recommendations.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}