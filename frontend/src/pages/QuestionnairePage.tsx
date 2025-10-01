import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ClipboardList, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";

interface Question {
  number: number;
  text: string;
  options: Array<{
    value: number;
    text: string;
  }>;
}

interface QuestionnaireData {
  _id: string;
  title: string;
  type: string;
  description: string;
  questions: Question[];
  scoringRules: any;
}

export default function QuestionnairePage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (isLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (type) {
      loadQuestionnaire();
    }
  }, [type, isAuthenticated, isLoading]);

  const loadQuestionnaire = async () => {
    try {
      setLoading(true);
      
      // Validate questionnaire type
      const validTypes = ['PHQ-9', 'GAD-7', 'GHQ-12', 'GHQ-28'];
      if (!validTypes.includes(type!)) {
        setError('Invalid questionnaire type');
        return;
      }

      const response = await apiService.getQuestionnaire(type as any);
      setQuestionnaire(response.questionnaire);
      
      // Start questionnaire session
      const sessionResponse = await apiService.startQuestionnaireSession(
        response.questionnaire._id,
        type!
      );
      setSessionId(sessionResponse.sessionId);
    } catch (err: any) {
      console.error('Failed to load questionnaire:', err);
      setError(err.message || 'Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (value: string) => {
    const answerValue = parseInt(value);
    const questionNumber = currentQuestion + 1;
    
    setAnswers(prev => ({
      ...prev,
      [questionNumber]: answerValue
    }));

    try {
      // Submit answer to backend
      await apiService.submitQuestionnaireAnswer(sessionId, questionNumber, answerValue);
    } catch (err: any) {
      console.error('Failed to submit answer:', err);
      setError('Failed to save answer. Please try again.');
    }
  };

  const handleNext = () => {
    if (currentQuestion < (questionnaire?.questions.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      
      // Check if all questions are answered
      const totalQuestions = questionnaire?.questions.length || 0;
      const answeredQuestions = Object.keys(answers).length;
      
      if (answeredQuestions < totalQuestions) {
        setError('Please answer all questions before completing the assessment.');
        return;
      }

      // Complete the questionnaire
      const response = await apiService.completeQuestionnaire(sessionId);
      setResults(response.results);
      setCompleted(true);
    } catch (err: any) {
      console.error('Failed to complete questionnaire:', err);
      setError(err.message || 'Failed to complete assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressPercentage = () => {
    if (!questionnaire) return 0;
    return Math.round(((currentQuestion + 1) / questionnaire.questions.length) * 100);
  };

  const getSeverityColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'minimal': return 'text-green-600';
      case 'mild': return 'text-yellow-600';
      case 'moderate': return 'text-orange-600';
      case 'severe': return 'text-red-600';
      case 'critical': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Layout >
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading assessment...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !questionnaire) {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  if (completed && results) {
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
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">{questionnaire?.title} Results</h3>
                <div className="space-y-4">
                  <div className="flex justify-center items-center gap-4">
                    <span className="text-2xl font-bold">Score: {results.totalScore}</span>
                    <span className={`text-lg font-semibold ${getSeverityColor(results.severity)}`}>
                      {results.severity}
                    </span>
                  </div>
                  
                  {results.interpretation && (
                    <div className="max-w-2xl mx-auto p-4 bg-muted rounded-lg">
                      <p className="text-sm">{results.interpretation}</p>
                    </div>
                  )}

                  {results.recommendations && results.recommendations.length > 0 && (
                    <div className="max-w-2xl mx-auto">
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
                      <ul className="text-sm space-y-1 text-left">
                        {results.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  Return Home
                </Button>
                <Button onClick={() => navigate('/chatbot')}>
                  Talk to AI Assistant
                </Button>
                {(results.severity === 'moderate' || results.severity === 'severe' || results.severity === 'critical') && (
                  <Button onClick={() => navigate('/peer/available')} variant="default">
                    Connect with Support
                  </Button>
                )}
              </div>

              {(results.severity === 'severe' || results.severity === 'critical') && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    <strong>Important:</strong> Your responses indicate you may benefit from professional support. 
                    Consider reaching out to a counselor or mental health professional. 
                    If you're in crisis, please contact emergency services or a crisis hotline immediately.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!questionnaire) {
    return (
      <Layout >
        <div className="max-w-4xl mx-auto p-6">
          <Alert>
            <AlertDescription>Questionnaire not found.</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const currentQ = questionnaire.questions[currentQuestion];
  const isLastQuestion = currentQuestion === questionnaire.questions.length - 1;
  const currentAnswer = answers[currentQuestion + 1];

  return (
    <Layout >
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-6 w-6 text-primary" />
              <CardTitle>{questionnaire.title}</CardTitle>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {currentQuestion + 1} of {questionnaire.questions.length}</span>
                <span>{getProgressPercentage()}% Complete</span>
              </div>
              <Progress value={getProgressPercentage()} className="w-full" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {currentQ.text}
              </h3>

              <RadioGroup
                value={currentAnswer?.toString() || ''}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                {currentQ.options.map((option) => (
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
                disabled={currentQuestion === 0}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  onClick={handleComplete}
                  disabled={!currentAnswer || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Assessment
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!currentAnswer}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Your responses are confidential and will help us provide better support.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}