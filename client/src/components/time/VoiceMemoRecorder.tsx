import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Play, Pause, Trash2, Send, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VoiceMemo {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
  transcript?: string;
}

interface VoiceMemoRecorderProps {
  onMemoSaved?: (memo: VoiceMemo) => void;
  maxDuration?: number; // in seconds
}

export function VoiceMemoRecorder({ 
  onMemoSaved, 
  maxDuration = 120 
}: VoiceMemoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      memos.forEach(memo => URL.revokeObjectURL(memo.url));
    };
  }, [memos]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const memo: VoiceMemo = {
          id: Date.now().toString(),
          blob,
          url,
          duration: recordingTime,
          timestamp: new Date()
        };
        
        setMemos(prev => [...prev, memo]);
        setRecordingTime(0);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        // Resume recording
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        
        // Restart the timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= maxDuration - 1) {
              stopRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        // Pause recording
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        
        // Stop the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  const playMemo = (memo: VoiceMemo) => {
    if (playingMemoId === memo.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingMemoId(null);
    } else {
      // Start playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(memo.url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingMemoId(null);
      };
      
      audio.play();
      setPlayingMemoId(memo.id);
    }
  };

  const deleteMemo = (memoId: string) => {
    const memo = memos.find(m => m.id === memoId);
    if (memo) {
      URL.revokeObjectURL(memo.url);
      setMemos(prev => prev.filter(m => m.id !== memoId));
      
      if (playingMemoId === memoId && audioRef.current) {
        audioRef.current.pause();
        setPlayingMemoId(null);
      }
    }
  };

  const transcribeMemo = async (memo: VoiceMemo) => {
    setIsTranscribing(true);
    
    // This would connect to a speech-to-text service
    // For now, we'll simulate with a placeholder
    try {
      // In production, this would send the audio blob to a transcription service
      // const formData = new FormData();
      // formData.append('audio', memo.blob);
      // const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      // const { transcript } = await response.json();
      
      // Demo transcription (real transcription coming soon)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const transcript = "[Demo Transcription] This feature will transcribe your actual speech in the future. Currently showing demo text for testing purposes.";
      
      setMemos(prev => prev.map(m => 
        m.id === memo.id ? { ...m, transcript } : m
      ));
      
      toast({
        title: "Transcription Complete",
        description: "Voice memo has been transcribed successfully."
      });
    } catch (error) {
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe the voice memo.",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const saveMemo = async (memo: VoiceMemo) => {
    if (onMemoSaved) {
      onMemoSaved(memo);
    }
    
    // For now, just show success message and keep memo in local storage
    // In production, this would upload to server
    toast({
      title: "Voice Memo Saved Locally",
      description: `Recording saved (${formatTime(memo.duration)}). Note: Currently stored in browser memory only.`
    });
    
    // Mark memo as saved (you could add a 'saved' flag to the VoiceMemo interface)
    setMemos(prev => prev.map(m => 
      m.id === memo.id ? { ...m, saved: true } as VoiceMemo & { saved?: boolean } : m
    ));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Memo Recorder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4 py-4">
          {!isRecording ? (
            <div className="flex flex-col items-center space-y-2">
              <Button
                size="lg"
                onClick={startRecording}
                className="rounded-full h-16 w-16"
                variant="destructive"
                data-testid="button-start-recording"
              >
                <Mic className="h-6 w-6" />
              </Button>
              <span className="text-sm text-muted-foreground">Start Recording</span>
            </div>
          ) : (
            <div className="flex items-center space-x-6">
              <div className="flex flex-col items-center space-y-2">
                <Button
                  size="lg"
                  onClick={pauseRecording}
                  className="rounded-full h-12 w-12"
                  variant="outline"
                  data-testid="button-pause-recording"
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {isPaused ? "Resume" : "Pause"}
                </span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Button
                  size="lg"
                  onClick={stopRecording}
                  className="rounded-full h-16 w-16 bg-red-500 hover:bg-red-600 text-white"
                  data-testid="button-stop-recording"
                >
                  <MicOff className="h-6 w-6" />
                </Button>
                <span className="text-sm font-medium text-red-600">Stop & Save</span>
              </div>
            </div>
          )}
        </div>

        {/* Recording Progress */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(recordingTime)}</span>
              <span>{formatTime(maxDuration)}</span>
            </div>
            <Progress 
              value={(recordingTime / maxDuration) * 100} 
              className="h-2"
            />
            {isPaused && (
              <p className="text-center text-sm text-muted-foreground">
                Recording Paused
              </p>
            )}
          </div>
        )}

        {/* Recorded Memos */}
        {memos.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Recorded Memos</h3>
            {memos.map(memo => (
              <div
                key={memo.id}
                className="flex items-start space-x-2 p-3 border rounded-lg"
                data-testid={`memo-item-${memo.id}`}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => playMemo(memo)}
                  data-testid={`button-play-${memo.id}`}
                >
                  {playingMemoId === memo.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {formatTime(memo.duration)} - {format(memo.timestamp, 'h:mm a')}
                    </span>
                    <div className="flex space-x-1">
                      {!memo.transcript && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => transcribeMemo(memo)}
                          disabled={isTranscribing}
                          data-testid={`button-transcribe-${memo.id}`}
                          title="Transcription coming soon - currently shows demo text"
                        >
                          {isTranscribing ? "Processing..." : "Transcribe (Demo)"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveMemo(memo)}
                        data-testid={`button-save-${memo.id}`}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMemo(memo.id)}
                        data-testid={`button-delete-${memo.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {memo.transcript && (
                    <p className="text-sm text-muted-foreground">
                      {memo.transcript}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}