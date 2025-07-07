import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, AlertTriangle, Clock, Factory, Shield, HardHat, Wrench } from "lucide-react";

// Workshop Site Induction Questions based on NZ industry standards
const INDUCTION_QUESTIONS = [
  {
    id: 1,
    category: "Emergency Procedures",
    icon: <AlertTriangle className="h-4 w-4" />,
    question: "What is the emergency evacuation assembly point for our workshop?",
    options: [
      "Main carpark near the office entrance",
      "Loading dock area",
      "Street outside the main gate",
      "Break room area"
    ],
    correct: 0,
    explanation: "The main carpark near the office entrance is clearly marked and provides safe distance from the workshop while allowing for headcount."
  },
  {
    id: 2,
    category: "Emergency Procedures", 
    icon: <AlertTriangle className="h-4 w-4" />,
    question: "In case of a fire emergency, what is the FIRST action you should take?",
    options: [
      "Try to extinguish the fire yourself",
      "Sound the fire alarm and evacuate immediately",
      "Call your supervisor",
      "Collect your personal belongings"
    ],
    correct: 1,
    explanation: "Sound the alarm immediately to warn others, then evacuate. Never risk your safety trying to fight fires without proper training."
  },
  {
    id: 3,
    category: "Personal Protective Equipment",
    icon: <HardHat className="h-4 w-4" />,
    question: "Which PPE items are MANDATORY in the steel fabrication workshop at all times?",
    options: [
      "Safety glasses only",
      "Safety boots and high-vis vest only", 
      "Safety glasses, safety boots, high-vis vest, and hard hat",
      "Only when using machinery"
    ],
    correct: 2,
    explanation: "Full PPE (safety glasses, boots, high-vis vest, hard hat) is mandatory at all times in the workshop due to overhead crane operations and steel handling."
  },
  {
    id: 4,
    category: "Equipment Safety",
    icon: <Wrench className="h-4 w-4" />,
    question: "Before operating any machinery, you must:",
    options: [
      "Check that it's clean",
      "Complete a pre-start safety checklist and ensure guards are in place",
      "Ask permission from another worker",
      "Turn it on to test it works"
    ],
    correct: 1,
    explanation: "Pre-start safety checks and ensuring all guards are properly in place are essential before operating any machinery."
  },
  {
    id: 5,
    category: "Equipment Safety",
    icon: <Wrench className="h-4 w-4" />,
    question: "If you notice a safety guard missing from a machine, you should:",
    options: [
      "Use the machine carefully",
      "Report it but continue working",
      "Immediately stop work, tag the machine 'DO NOT USE' and report to supervisor",
      "Fix it yourself if you can"
    ],
    correct: 2,
    explanation: "Any machine with missing safety equipment must be immediately taken out of service and reported. Never operate unsafe equipment."
  },
  {
    id: 6,
    category: "Lifting & Handling",
    icon: <Factory className="h-4 w-4" />,
    question: "The maximum weight you should manually lift without mechanical assistance is:",
    options: [
      "25kg",
      "No limit if you're strong",
      "50kg", 
      "15kg (or lower based on your capability assessment)"
    ],
    correct: 3,
    explanation: "Manual handling limits are based on individual capability assessments, with 15kg being a general guideline. Always use mechanical aids for heavier items."
  },
  {
    id: 7,
    category: "Lifting & Handling",
    icon: <Factory className="h-4 w-4" />,
    question: "When using the overhead crane, who can operate the controls?",
    options: [
      "Anyone who has watched it being used",
      "Only certified crane operators with current certification",
      "Any experienced steel worker",
      "Supervisors only"
    ],
    correct: 1,
    explanation: "Only workers with current crane operator certification can operate overhead cranes. This is a legal requirement in New Zealand."
  },
  {
    id: 8,
    category: "Hazard Identification",
    icon: <Shield className="h-4 w-4" />,
    question: "If you identify a new hazard in the workplace, you should:",
    options: [
      "Ignore it if it doesn't affect your work",
      "Tell someone at break time",
      "Immediately report it to your supervisor and record it in the hazard register",
      "Handle it yourself"
    ],
    correct: 2,
    explanation: "All hazards must be immediately reported to supervisors and recorded in the hazard register as per NZ health and safety legislation."
  },
  {
    id: 9,
    category: "Chemical Safety",
    icon: <Shield className="h-4 w-4" />,
    question: "Safety Data Sheets (SDS) for chemicals used in the workshop:",
    options: [
      "Are optional reading material",
      "Must be read and understood before using any chemical product",
      "Only supervisors need to read them",
      "Are kept in the office only"
    ],
    correct: 1,
    explanation: "SDS must be read and understood by all workers before using chemicals. They contain critical safety information including first aid procedures."
  },
  {
    id: 10,
    category: "Workshop Rules",
    icon: <Factory className="h-4 w-4" />,
    question: "Alcohol and drug testing in our workplace:",
    options: [
      "Never happens",
      "Only for new employees",
      "Can be conducted randomly and after incidents as per company policy",
      "Only if someone reports you"
    ],
    correct: 2,
    explanation: "Random testing and post-incident testing are part of our safety policy to ensure a safe working environment for everyone."
  },
  {
    id: 11,
    category: "First Aid",
    icon: <AlertTriangle className="h-4 w-4" />,
    question: "In case of a serious injury, after ensuring the scene is safe, you should:",
    options: [
      "Move the injured person to a comfortable position",
      "Call 111 (emergency services) and get a first aider",
      "Give the person water",
      "Continue working and let someone else handle it"
    ],
    correct: 1,
    explanation: "Call 111 for serious injuries and get a qualified first aider. Do not move injured persons unless they are in immediate danger."
  },
  {
    id: 12,
    category: "Workshop Rules",
    icon: <Factory className="h-4 w-4" />,
    question: "Housekeeping in the workshop means:",
    options: [
      "Cleaning is the cleaner's job only",
      "Keep your work area clean and tidy to prevent slips, trips and falls", 
      "Clean up only at the end of the week",
      "Someone else will clean up"
    ],
    correct: 1,
    explanation: "Good housekeeping is everyone's responsibility and prevents many workplace accidents. Clean as you go."
  },
  {
    id: 13,
    category: "Welding Safety",
    icon: <Wrench className="h-4 w-4" />,
    question: "Before welding, you must ensure:",
    options: [
      "The area is well ventilated and fire watch is in place",
      "You have enough welding rod",
      "The metal is clean",
      "Someone is watching you work"
    ],
    correct: 0,
    explanation: "Proper ventilation prevents fume inhalation and fire watch procedures prevent fire hazards during hot work."
  },
  {
    id: 14,
    category: "Incident Reporting",
    icon: <Shield className="h-4 w-4" />,
    question: "Near miss incidents should be:",
    options: [
      "Ignored as no one was hurt",
      "Reported only if someone asks",
      "Reported immediately as they help prevent future accidents",
      "Kept to yourself"
    ],
    correct: 2,
    explanation: "Near misses are valuable learning opportunities that help prevent actual accidents. They must be reported and investigated."
  },
  {
    id: 15,
    category: "Workshop Rules", 
    icon: <Factory className="h-4 w-4" />,
    question: "Mobile phone use in the workshop is:",
    options: [
      "Allowed anywhere",
      "Prohibited in machinery operation areas and during safety-critical tasks",
      "Only for supervisors",
      "Allowed during breaks only"
    ],
    correct: 1,
    explanation: "Mobile phones can be dangerous distractions around machinery and during safety-critical tasks. Use only in designated safe areas."
  }
];

interface WorkshopInductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (passed: boolean, score: number) => void;
  employeeName: string;
}

export function WorkshopInductionModal({ isOpen, onClose, onComplete, employeeName }: WorkshopInductionModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [timeStarted] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;
    
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestion < INDUCTION_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate results
      const correctAnswers = newAnswers.filter((answer, index) => 
        answer === INDUCTION_QUESTIONS[index].correct
      ).length;
      const score = Math.round((correctAnswers / INDUCTION_QUESTIONS.length) * 100);
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const timeElapsed = Math.round((Date.now() - timeStarted) / 1000 / 60); // minutes
  const progress = ((currentQuestion + (selectedAnswer !== null ? 1 : 0)) / INDUCTION_QUESTIONS.length) * 100;
  
  const correctAnswers = answers.filter((answer, index) => 
    answer === INDUCTION_QUESTIONS[index].correct
  ).length;
  const score = answers.length > 0 ? Math.round((correctAnswers / INDUCTION_QUESTIONS.length) * 100) : 0;
  const passed = score === 100;

  if (showResult) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Workshop Site Induction - Results
            </DialogTitle>
          </DialogHeader>
          
          <Card className={`border-2 ${passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {passed ? (
                  <CheckCircle className="h-16 w-16 text-green-600" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-600" />
                )}
              </div>
              <CardTitle className={`text-2xl ${passed ? 'text-green-700' : 'text-red-700'}`}>
                {passed ? 'CONGRATULATIONS!' : 'INDUCTION NOT COMPLETED'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{score}%</div>
                <div className="text-gray-600">
                  {correctAnswers} out of {INDUCTION_QUESTIONS.length} questions correct
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Completed in {timeElapsed} minutes
                </div>
              </div>

              <Separator />

              {passed ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>{employeeName}</strong> has successfully completed the Workshop Site Induction with a perfect score. 
                    You are now authorized to work in the Lateral Engineering workshop.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    A score of 100% is required to pass the induction. Please review the safety procedures and retake the assessment.
                    Incorrect answers indicate safety knowledge gaps that must be addressed before workshop authorization.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-center">
                {passed ? (
                  <Button 
                    onClick={() => {
                      onComplete(true, score);
                      onClose();
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete Induction
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={resetQuiz}>
                      Retake Assessment
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                      Study & Return Later
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  const question = INDUCTION_QUESTIONS[currentQuestion];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Lateral Engineering Workshop Site Induction
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {timeElapsed} min
            </div>
            <Badge variant="secondary">
              Question {currentQuestion + 1} of {INDUCTION_QUESTIONS.length}
            </Badge>
            <Badge variant="outline">
              100% Required to Pass
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Progress value={progress} className="w-full" />
          
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2 text-blue-700">
                {question.icon}
                <Badge variant="secondary">{question.category}</Badge>
              </div>
              <CardTitle className="text-lg leading-relaxed">
                {question.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswer === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            <Button
              onClick={handleNextQuestion}
              disabled={selectedAnswer === null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {currentQuestion === INDUCTION_QUESTIONS.length - 1 ? 'Complete Assessment' : 'Next Question'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}