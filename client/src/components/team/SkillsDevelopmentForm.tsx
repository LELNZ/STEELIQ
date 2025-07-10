import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Monitor, Users, Award, Plus, X, Calendar } from "lucide-react";
import { format } from "date-fns";

interface SkillsDevelopmentFormProps {
  member: any;
  onUpdate: (field: string, value: any) => void;
  isEditing?: boolean;
  isNewEmployee?: boolean;
}

interface Skill {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  category: string;
}

interface Training {
  id: string;
  name: string;
  type: 'Internal' | 'External' | 'Online' | 'Conference';
  provider: string;
  completionDate: string;
  expiryDate?: string;
  certificateNumber?: string;
}

const SKILL_CATEGORIES = [
  "Welding & Fabrication",
  "CAD/Engineering Software",
  "Project Management",
  "Quality Control",
  "Safety Management",
  "Leadership",
  "Communication",
  "Technical Documentation"
];

const SOFTWARE_SKILLS = [
  "AutoCAD",
  "SolidWorks",
  "Tekla Structures",
  "Revit",
  "MS Project",
  "Primavera",
  "SAP",
  "Microsoft Office",
  "Xero",
  "MYOB"
];

const TECHNICAL_COMPETENCIES = [
  "MIG Welding",
  "TIG Welding",
  "Stick Welding",
  "Plasma Cutting",
  "CNC Operation",
  "Blueprint Reading",
  "Structural Steel Detailing",
  "Quality Inspection",
  "NDT Testing",
  "Crane Operation"
];

export function SkillsDevelopmentForm({ member, onUpdate, isEditing = false, isNewEmployee = false }: SkillsDevelopmentFormProps) {
  const canEdit = isEditing || isNewEmployee;
  
  const [technicalSkills, setTechnicalSkills] = useState<Skill[]>(member?.technicalSkills || []);
  const [softwareSkills, setSoftwareSkills] = useState<Skill[]>(member?.softwareSkills || []);
  const [trainings, setTrainings] = useState<Training[]>(member?.completedTrainings || []);
  
  const addSkill = (type: 'technical' | 'software') => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: '',
      level: 'Beginner',
      category: type === 'technical' ? 'Welding & Fabrication' : 'CAD/Engineering Software'
    };
    
    if (type === 'technical') {
      const updated = [...technicalSkills, newSkill];
      setTechnicalSkills(updated);
      onUpdate('technicalSkills', updated);
    } else {
      const updated = [...softwareSkills, newSkill];
      setSoftwareSkills(updated);
      onUpdate('softwareSkills', updated);
    }
  };
  
  const updateSkill = (type: 'technical' | 'software', index: number, field: keyof Skill, value: string) => {
    if (type === 'technical') {
      const updated = [...technicalSkills];
      updated[index] = { ...updated[index], [field]: value };
      setTechnicalSkills(updated);
      onUpdate('technicalSkills', updated);
    } else {
      const updated = [...softwareSkills];
      updated[index] = { ...updated[index], [field]: value };
      setSoftwareSkills(updated);
      onUpdate('softwareSkills', updated);
    }
  };
  
  const removeSkill = (type: 'technical' | 'software', index: number) => {
    if (type === 'technical') {
      const updated = technicalSkills.filter((_, i) => i !== index);
      setTechnicalSkills(updated);
      onUpdate('technicalSkills', updated);
    } else {
      const updated = softwareSkills.filter((_, i) => i !== index);
      setSoftwareSkills(updated);
      onUpdate('softwareSkills', updated);
    }
  };
  
  const addTraining = () => {
    const newTraining: Training = {
      id: Date.now().toString(),
      name: '',
      type: 'Internal',
      provider: '',
      completionDate: new Date().toISOString().split('T')[0]
    };
    const updated = [...trainings, newTraining];
    setTrainings(updated);
    onUpdate('completedTrainings', updated);
  };
  
  const updateTraining = (index: number, field: keyof Training, value: string) => {
    const updated = [...trainings];
    updated[index] = { ...updated[index], [field]: value };
    setTrainings(updated);
    onUpdate('completedTrainings', updated);
  };
  
  const removeTraining = (index: number) => {
    const updated = trainings.filter((_, i) => i !== index);
    setTrainings(updated);
    onUpdate('completedTrainings', updated);
  };
  
  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'Expert': return 'text-green-600';
      case 'Advanced': return 'text-blue-600';
      case 'Intermediate': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };
  
  const getSkillLevelProgress = (level: string) => {
    switch (level) {
      case 'Expert': return 100;
      case 'Advanced': return 75;
      case 'Intermediate': return 50;
      default: return 25;
    }
  };

  return (
    <div className="space-y-6">
      {/* Technical Competencies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Technical Competencies
          </CardTitle>
          <CardDescription>
            Core technical skills and expertise levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={() => addSkill('technical')} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Skill
              </Button>
            </div>
          )}
          
          {technicalSkills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No technical skills recorded
            </div>
          ) : (
            <div className="space-y-3">
              {technicalSkills.map((skill, index) => (
                <div key={skill.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {canEdit ? (
                    <>
                      <Select
                        value={skill.name}
                        onValueChange={(value) => updateSkill('technical', index, 'name', value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {TECHNICAL_COMPETENCIES.map(comp => (
                            <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={skill.level}
                        onValueChange={(value) => updateSkill('technical', index, 'level', value as Skill['level'])}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                          <SelectItem value="Expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkill('technical', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{skill.name}</p>
                        <p className={`text-sm ${getSkillLevelColor(skill.level)}`}>{skill.level}</p>
                      </div>
                      <Progress value={getSkillLevelProgress(skill.level)} className="w-32" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Software Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Software Certifications
          </CardTitle>
          <CardDescription>
            Engineering software and digital tool proficiencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={() => addSkill('software')} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Software
              </Button>
            </div>
          )}
          
          {softwareSkills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No software skills recorded
            </div>
          ) : (
            <div className="space-y-3">
              {softwareSkills.map((skill, index) => (
                <div key={skill.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {canEdit ? (
                    <>
                      <Select
                        value={skill.name}
                        onValueChange={(value) => updateSkill('software', index, 'name', value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select software" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOFTWARE_SKILLS.map(sw => (
                            <SelectItem key={sw} value={sw}>{sw}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={skill.level}
                        onValueChange={(value) => updateSkill('software', index, 'level', value as Skill['level'])}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                          <SelectItem value="Expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkill('software', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{skill.name}</p>
                        <p className={`text-sm ${getSkillLevelColor(skill.level)}`}>{skill.level}</p>
                      </div>
                      <Progress value={getSkillLevelProgress(skill.level)} className="w-32" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leadership & Training */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Leadership & Training History
          </CardTitle>
          <CardDescription>
            Completed training programs and leadership development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={addTraining} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Training
              </Button>
            </div>
          )}
          
          {trainings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No training records
            </div>
          ) : (
            <div className="space-y-3">
              {trainings.map((training, index) => (
                <div key={training.id} className="border rounded-lg p-4 space-y-3">
                  {canEdit ? (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <Input
                            value={training.name}
                            onChange={(e) => updateTraining(index, 'name', e.target.value)}
                            placeholder="Training name"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              value={training.type}
                              onValueChange={(value) => updateTraining(index, 'type', value as Training['type'])}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Internal">Internal</SelectItem>
                                <SelectItem value="External">External</SelectItem>
                                <SelectItem value="Online">Online</SelectItem>
                                <SelectItem value="Conference">Conference</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={training.provider}
                              onChange={(e) => updateTraining(index, 'provider', e.target.value)}
                              placeholder="Provider/Institution"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              type="date"
                              value={training.completionDate}
                              onChange={(e) => updateTraining(index, 'completionDate', e.target.value)}
                            />
                            <Input
                              value={training.certificateNumber || ''}
                              onChange={(e) => updateTraining(index, 'certificateNumber', e.target.value)}
                              placeholder="Certificate number (optional)"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTraining(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{training.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {training.type} • {training.provider}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          <Award className="h-3 w-3 mr-1" />
                          {training.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Completed: {format(new Date(training.completionDate), "MMM d, yyyy")}
                        </span>
                        {training.certificateNumber && (
                          <span>Certificate: {training.certificateNumber}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Career Development Goals */}
          <div className="mt-6 space-y-2">
            <Label>Career Development Goals</Label>
            {canEdit ? (
              <Textarea
                value={member?.careerGoals || ""}
                onChange={(e) => onUpdate('careerGoals', e.target.value)}
                placeholder="Short-term and long-term career objectives"
                rows={3}
              />
            ) : (
              <p className="mt-1 whitespace-pre-wrap">{member?.careerGoals || "No goals recorded"}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}