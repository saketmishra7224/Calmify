import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Play, Pause, Square, Volume2, VolumeX, RotateCcw, Brain, Heart, Leaf, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MeditationResource {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'audio' | 'video' | 'guided';
  audioUrl?: string;
  videoUrl?: string;
  transcript: string;
  tags: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Static meditation resources
const meditationResources: MeditationResource[] = [
  {
    id: "1",
    title: "5-Minute Breathing Exercise",
    description: "Simple breathing technique to reduce stress and anxiety",
    duration: "5:00",
    type: "audio",
    transcript: "Welcome to this 5-minute breathing exercise. Find a comfortable position and close your eyes. Breathe in slowly for 4 counts, hold for 4 counts, then exhale for 6 counts. Focus on the rhythm of your breath...",
    tags: ["anxiety", "stress", "breathing"],
    category: "relaxation",
    difficulty: "beginner"
  },
  {
    id: "2", 
    title: "Body Scan Relaxation",
    description: "Progressive muscle relaxation to release tension",
    duration: "10:00",
    type: "guided",
    transcript: "Let's begin with a full body scan. Start by focusing on your toes. Tense the muscles in your toes for 5 seconds, then release. Feel the tension melting away...",
    tags: ["relaxation", "sleep", "tension"],
    category: "sleep",
    difficulty: "beginner"
  },
  {
    id: "3",
    title: "Mindful Morning",
    description: "Start your day with intention and clarity",
    duration: "8:00", 
    type: "guided",
    transcript: "Good morning. Take a moment to notice how you feel right now. What sensations do you notice in your body? What thoughts are present?...",
    tags: ["morning", "mindfulness", "energy"],
    category: "energy",
    difficulty: "intermediate"
  },
  {
    id: "4",
    title: "Sleep Preparation",
    description: "Wind down and prepare for restful sleep",
    duration: "15:00",
    type: "audio", 
    transcript: "As we prepare for sleep, let go of the day's worries. Feel your body sinking into comfort. Notice your breathing naturally slowing...",
    tags: ["sleep", "relaxation", "bedtime"],
    category: "sleep", 
    difficulty: "beginner"
  },
  {
    id: "5",
    title: "Anxiety Relief",
    description: "Techniques to calm racing thoughts and worries",
    duration: "12:00",
    type: "guided",
    transcript: "When anxiety arises, remember you are safe right now. Let's practice grounding techniques. Notice 5 things you can see, 4 things you can touch...",
    tags: ["anxiety", "calm", "grounding"],
    category: "anxiety",
    difficulty: "intermediate"  
  },
  {
    id: "6",
    title: "Focus & Concentration",
    description: "Improve mental clarity and attention",
    duration: "20:00",
    type: "guided",
    transcript: "Concentration meditation helps train the mind. Choose a single point of focus - perhaps your breath at the nostrils...",
    tags: ["focus", "concentration", "productivity"],
    category: "focus",
    difficulty: "advanced"
  }
];

export default function MeditationPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentResource, setCurrentResource] = useState<MeditationResource | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ["all", "relaxation", "sleep", "energy", "anxiety", "focus"];
  
  // Simulate audio playback with timer
  const simulateAudioPlayback = (resource: MeditationResource) => {
    const totalSeconds = parseInt(resource.duration.replace(":", "")) || 300; // Default 5 minutes
    setDuration(totalSeconds);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= totalSeconds) {
          setIsPlaying(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const filteredResources = meditationResources.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePlayResource = (resource: MeditationResource) => {
    setCurrentResource(resource);
    setCurrentTime(0);
    simulateAudioPlayback(resource);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else if (currentResource) {
      simulateAudioPlayback(currentResource);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (currentResource) {
      simulateAudioPlayback(currentResource);
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'relaxation': return <Leaf className="h-4 w-4" />;
      case 'sleep': return <Moon className="h-4 w-4" />;
      case 'energy': return <Sun className="h-4 w-4" />;
      case 'anxiety': return <Heart className="h-4 w-4" />;
      case 'focus': return <Brain className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                Meditation & Mindfulness
              </h1>
              <p className="text-muted-foreground mt-1">Guided meditation sessions for relaxation and mindfulness</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meditation sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="all">All Categories</option>
              <option value="relaxation">Relaxation</option>
              <option value="sleep">Sleep</option>
              <option value="energy">Energy</option>
              <option value="anxiety">Anxiety Relief</option>
              <option value="focus">Focus & Concentration</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Meditation Resources */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Available Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(resource.category)}
                        <Badge variant="secondary" className="text-xs">
                          {resource.category}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{resource.duration}</span>
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      onClick={() => handlePlayResource(resource)}
                      className="w-full"
                      variant={currentResource?.id === resource.id ? "secondary" : "default"}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {currentResource?.id === resource.id && isPlaying ? "Now Playing" : "Play Session"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredResources.length === 0 && (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No meditation sessions found matching your criteria.</p>
                <Button 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Audio Player */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Meditation Player
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentResource ? (
                  <>
                    <div className="text-center">
                      <h3 className="font-semibold">{currentResource.title}</h3>
                      <p className="text-sm text-muted-foreground">{currentResource.description}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-1000" 
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Player Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <Button size="sm" variant="outline" onClick={handleRestart}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button size="lg" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleStop}>
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const newVolume = parseFloat(e.target.value);
                          setVolume(newVolume);
                          setIsMuted(newVolume === 0);
                        }}
                        className="flex-1"
                      />
                    </div>

                    {/* Transcript */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Guided Instructions:</h4>
                      <div className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md max-h-32 overflow-y-auto">
                        {currentResource.transcript}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a meditation session to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}