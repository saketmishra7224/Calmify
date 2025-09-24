import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Play, Pause, Square, Volume2, VolumeX, RotateCcw, Brain, Heart, Leaf, Sun, Moon, ExternalLink, X } from "lucide-react";
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

interface CardItem {
  title: string;
  desc?: string;
  provider?: string;
  author?: string;
  url?: string;
  linkLabel?: string;
  link?: string;
  image?: string;
  source?: string;
  youtubeId?: string;
}

type TabKey = "Techniques" | "Videos" | "Books" | "Articles" | "Audio";

const techniqueImages = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=400&q=80",
];

const bookImages = [
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80", // Book/library scene
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80", // Stack of books
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=400&q=80", // Open book
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80", // Book with coffee - alternative for 10% Happier
];

const TECHNIQUES = [
  {
    title: "Box Breathing",
    desc: "Inhale 4 sec → Hold 4 sec → Exhale 4 sec → Hold 4 sec.",
    linkLabel: "Guide",
    link: "https://www.healthline.com/health/box-breathing",
    image: techniqueImages[0],
  },
  {
    title: "Progressive Muscle Relaxation",
    desc: "Tense & release muscle groups from toes to head.",
    linkLabel: "Step-by-step",
    link: "https://www.anxietycanada.com/articles/how-to-do-progressive-muscle-relaxation/",
    image: techniqueImages[1],
  },
  {
    title: "5-4-3-2-1 Grounding",
    desc: "Identify 5 things you see, 4 touch, 3 hear, 2 smell, 1 taste.",
    linkLabel: "Instructions",
    link: "https://www.therapistaid.com/worksheets/grounding-techniques.pdf",
    image: techniqueImages[2],
  },
  {
    title: "Loving-Kindness Meditation",
    desc: "Cultivate compassion for self & others.",
    linkLabel: "Script",
    link: "https://www.mindful.org/a-loving-kindness-meditation-to-boost-compassion/",
    image: techniqueImages[3],
  },
];

const PLAYLISTS = [
  {
    title: "10-Minute Mindfulness Meditation",
    provider: "YouTube – The Mindful Movement",
    url: "https://www.youtube.com/watch?v=ZToicYcHIOU",
    youtubeId: "ZToicYcHIOU",
  },
  {
    title: "5-Minute Meditation You Can Do Anywhere",
    provider: "YouTube – Goodful",
    url: "https://www.youtube.com/watch?v=inpok4MKVLM",
    youtubeId: "inpok4MKVLM",
  },
  {
    title: "Body Scan Meditation for Beginners",
    provider: "YouTube – Jon Kabat-Zinn",
    url: "https://www.youtube.com/watch?v=OS_iqfGjL78",
    youtubeId: "OS_iqfGjL78",
  },
  {
    title: "Guided Loving-Kindness Meditation",
    provider: "YouTube – Great Meditation",
    url: "https://www.youtube.com/watch?v=sz7cpV7ERsM",
    youtubeId: "sz7cpV7ERsM",
  },
];

const BOOKS = [
  {
    title: "Wherever You Go, There You Are",
    author: "Jon Kabat-Zinn",
    url: "https://www.goodreads.com/book/show/11638.Wherever_You_Go_There_You_Are",
    image: bookImages[0],
  },
  {
    title: "The Miracle of Mindfulness",
    author: "Thich Nhat Hanh",
    url: "https://www.goodreads.com/book/show/4352.The_Miracle_of_Mindfulness",
    image: bookImages[1],
  },
  {
    title: "Radical Acceptance",
    author: "Tara Brach",
    url: "https://www.goodreads.com/book/show/575338.Radical_Acceptance",
    image: bookImages[2],
  },
  {
    title: "10% Happier",
    author: "Dan Harris",
    url: "https://www.goodreads.com/book/show/15828145-10-happier",
    image: bookImages[3],
  },
];

const ARTICLES = [
  {
    title: "How to Meditate",
    source: "Mindful.org",
    url: "https://www.mindful.org/how-to-meditate/",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
  },
  {
    title: "Meditation: A simple, fast way to reduce stress",
    source: "Mayo Clinic",
    url: "https://www.mayoclinic.org/tests-procedures/meditation/in-depth/meditation/art-20045858",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
  },
  {
    title: "Mental health and self-care resources",
    source: "WHO",
    url: "https://www.who.int/teams/mental-health-and-substance-use/mental-health-in-emergencies",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
  },
];

const AUDIOS = [
  {
    title: "Calm Piano Music for Stress Relief",
    desc: "Gentle piano music to help reduce stress and anxiety.",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80",
  },
  {
    title: "Soothing Nature Sounds",
    desc: "Relaxing sounds of nature for meditation and sleep.",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80", // Forest/nature scene
  },
  {
    title: "Deep Meditation Ambient",
    desc: "Ambient music for deep meditation and relaxation.",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
  },
];

// Static meditation resources - only from original user-provided data with external links
const meditationResources: MeditationResource[] = [
  
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
  const [activeTab, setActiveTab] = useState<TabKey>("Techniques");
  const [selectedVideoResource, setSelectedVideoResource] = useState<CardItem | null>(null);
  const [showMeditationPlayer, setShowMeditationPlayer] = useState(false);
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

  const openVideo = (video: CardItem) => {
    // Convert video to meditation resource format for the player
    const videoResource: MeditationResource = {
      id: `video-${video.youtubeId}`,
      title: video.title || "",
      description: video.provider || "",
      duration: "0:00", // YouTube videos don't have predetermined duration
      type: 'video',
      videoUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
      transcript: `YouTube video: ${video.title} by ${video.provider}`,
      tags: ["video", "youtube", "meditation"],
      category: "video",
      difficulty: "beginner"
    };
    setCurrentResource(videoResource);
    setSelectedVideoResource(video);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setShowMeditationPlayer(true);
  };

  const openAudio = (audio: CardItem) => {
    // Convert audio to meditation resource format for the player
    const audioResource: MeditationResource = {
      id: `audio-${audio.title.replace(/\s+/g, '-').toLowerCase()}`,
      title: audio.title || "",
      description: audio.desc || "",
      duration: "0:00",
      type: 'audio',
      audioUrl: audio.url,
      transcript: `Audio track: ${audio.title}. ${audio.desc}`,
      tags: ["audio", "relaxation", "meditation"],
      category: "relaxation",
      difficulty: "beginner"
    };
    setCurrentResource(audioResource);
    setSelectedVideoResource(audio);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setShowMeditationPlayer(true);
  };

  const closeMeditationPlayer = () => {
    setShowMeditationPlayer(false);
    setCurrentResource(null);
    setSelectedVideoResource(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const renderTechniqueCard = (item: CardItem, index: number) => (
    <Card key={index} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
      <div className="relative">
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
          <p className="text-sm opacity-90 mb-3">{item.desc}</p>
          <Button
            size="sm"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
            asChild
          >
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              {item.linkLabel}
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderVideoCard = (item: CardItem, index: number) => (
    <Card key={index} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
          onClick={() => openVideo(item)}>
      <div className="relative">
        <img 
          src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-red-600 rounded-full p-4 group-hover:bg-red-700 transition-colors">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
          <p className="text-sm opacity-90">{item.provider}</p>
        </div>
      </div>
    </Card>
  );

  const renderBookCard = (item: CardItem, index: number) => (
    <Card key={index} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
      <div className="relative">
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
          <p className="text-sm opacity-90 mb-3">by {item.author}</p>
          <Button
            size="sm"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
            asChild
          >
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Goodreads
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderArticleCard = (item: CardItem, index: number) => (
    <Card key={index} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
      <div className="relative">
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
          <p className="text-sm opacity-90 mb-3">{item.source}</p>
          <Button
            size="sm"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
            asChild
          >
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Read Article
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderAudioCard = (item: CardItem, index: number) => (
    <Card key={index} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
          onClick={() => openAudio(item)}>
      <div className="relative">
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-green-600 rounded-full p-4 group-hover:bg-green-700 transition-colors">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
          <p className="text-sm opacity-90">{item.desc}</p>
        </div>
      </div>
    </Card>
  );

  const getResourceData = () => {
    switch (activeTab) {
      case "Techniques": return TECHNIQUES;
      case "Videos": return PLAYLISTS;
      case "Books": return BOOKS;
      case "Articles": return ARTICLES;
      case "Audio": return AUDIOS;
      default: return TECHNIQUES;
    }
  };

  const renderResourceCard = (item: CardItem, index: number) => {
    switch (activeTab) {
      case "Techniques": return renderTechniqueCard(item, index);
      case "Videos": return renderVideoCard(item, index);
      case "Books": return renderBookCard(item, index);
      case "Articles": return renderArticleCard(item, index);
      case "Audio": return renderAudioCard(item, index);
      default: return renderTechniqueCard(item, index);
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
              title="Select category"
            >
              <option value="all">All Categories</option>
              <option value="relaxation">Relaxation</option>
              <option value="sleep">Sleep</option>
              <option value="energy">Energy</option>
              <option value="anxiety">Anxiety Relief</option>
              <option value="focus">Focus & Concentration</option>
            </select>
          </div>

          {/* Resource Tabs */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            {(["Techniques", "Videos", "Books", "Articles", "Audio"] as TabKey[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                onClick={() => setActiveTab(tab)}
                className="whitespace-nowrap"
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        <div className={`grid gap-6 p-6 ${showMeditationPlayer ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* Meditation Resources */}
          <div className={showMeditationPlayer ? "lg:col-span-2" : "col-span-1"}>
            <h2 className="text-xl font-semibold mb-4">Available Sessions - {activeTab}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Always show the selected resource type based on active tab */}
              {getResourceData().map((item, index) => renderResourceCard(item, index))}
            </div>

            {/* Show no results message if no data available */}
            {getResourceData().length === 0 && (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No content available for this section.</p>
              </div>
            )}
          </div>

          {/* Audio Player - Only show when content is selected */}
          {showMeditationPlayer && (
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Meditation Player
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeMeditationPlayer}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentResource ? (
                    <>
                      {/* Audio/Video Thumbnail */}
                      {selectedVideoResource && selectedVideoResource.image && (
                        <div className="text-center">
                          <img 
                            src={selectedVideoResource.image} 
                            alt={currentResource.title}
                            className="w-full h-32 object-cover rounded-md mb-2"
                          />
                        </div>
                      )}
                      
                      <div className="text-center">
                        <h3 className="font-semibold">{currentResource.title}</h3>
                        <p className="text-sm text-muted-foreground">{currentResource.description}</p>
                      </div>

                      {/* Video Player for YouTube content */}
                      {currentResource.type === 'video' && selectedVideoResource && (
                        <div className="aspect-video mb-4">
                          <iframe
                            src={currentResource.videoUrl}
                            title={currentResource.title}
                            className="w-full h-full rounded-md"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      )}

                      {/* Audio Player for audio content */}
                      {currentResource.type === 'audio' && currentResource.audioUrl && (
                        <div className="mb-4">
                          <audio 
                            controls 
                            className="w-full"
                            preload="metadata"
                            src={currentResource.audioUrl}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}

                      {/* Progress Bar - Only show for non-video content */}
                      {currentResource.type !== 'video' && (
                        <div className="space-y-2">
                          <div className="w-full bg-secondary rounded-full h-2 relative overflow-hidden">
                            <div 
                              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-1000"
                              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        </div>
                      )}

                      {/* Player Controls - Only show for non-video content */}
                      {currentResource.type !== 'video' && (
                        <>
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
                              title="Volume control"
                              aria-label="Volume control"
                            />
                          </div>
                        </>
                      )}

                      {/* Transcript */}
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">
                          {currentResource.type === 'video' ? 'Video Details:' : 'Audio Details:'}
                        </h4>
                        <div className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md max-h-32 overflow-y-auto">
                          {currentResource.transcript}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a video or audio to begin</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* YouTube Video Modal */}
      </div>
    </Layout>
  );
}