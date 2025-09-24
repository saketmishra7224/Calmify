import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  FileText, 
  Video, 
  Headphones, 
  ExternalLink, 
  Download,
  Heart,
  Users,
  Phone,
  MessageCircle,
  AlertTriangle,
  Shield,
  Clock,
  Star
} from 'lucide-react';

const PeerResourcesPage: React.FC = () => {
  const documentResources = [
    {
      title: "Peer Support Guidelines",
      description: "Complete guide on providing effective peer support and maintaining boundaries",
      type: "PDF Guide",
      category: "Essential",
      icon: <FileText className="h-5 w-5" />,
      downloadUrl: "#",
      size: "2.3 MB"
    },
    {
      title: "Crisis Intervention Protocols",
      description: "Step-by-step procedures for handling crisis situations and when to escalate",
      type: "PDF Manual",
      category: "Critical",
      icon: <AlertTriangle className="h-5 w-5" />,
      downloadUrl: "#",
      size: "1.8 MB"
    },
    {
      title: "Communication Best Practices",
      description: "Effective communication techniques for peer support conversations",
      type: "PDF Handbook",
      category: "Skills",
      icon: <MessageCircle className="h-5 w-5" />,
      downloadUrl: "#",
      size: "1.2 MB"
    },
    {
      title: "Self-Care for Peer Supporters",
      description: "Maintaining your own mental health while supporting others",
      type: "PDF Guide",
      category: "Wellness",
      icon: <Heart className="h-5 w-5" />,
      downloadUrl: "#",
      size: "890 KB"
    }
  ];

  const articles = [
    {
      title: "Understanding Trauma-Informed Care",
      description: "Learn about trauma-informed approaches in peer support settings",
      readTime: "8 min read",
      category: "Education",
      url: "#",
      featured: true
    },
    {
      title: "Building Rapport with Vulnerable Individuals",
      description: "Techniques for establishing trust and connection in peer support relationships",
      readTime: "6 min read",
      category: "Skills",
      url: "#",
      featured: false
    },
    {
      title: "Recognizing Warning Signs",
      description: "How to identify when someone may need professional intervention",
      readTime: "10 min read",
      category: "Safety",
      url: "#",
      featured: true
    },
    {
      title: "Cultural Sensitivity in Peer Support",
      description: "Providing inclusive and culturally aware support to diverse populations",
      readTime: "7 min read",
      category: "Diversity",
      url: "#",
      featured: false
    },
    {
      title: "Managing Difficult Conversations",
      description: "Strategies for navigating challenging or emotionally intense discussions",
      readTime: "12 min read",
      category: "Communication",
      url: "#",
      featured: true
    }
  ];

  const mediaResources = [
    {
      title: "Active Listening Techniques",
      description: "Video tutorial on effective listening skills for peer support",
      type: "Video",
      duration: "15 min",
      icon: <Video className="h-5 w-5" />,
      url: "#"
    },
    {
      title: "De-escalation Strategies",
      description: "Audio training on calming techniques and conflict resolution",
      type: "Audio",
      duration: "22 min",
      icon: <Headphones className="h-5 w-5" />,
      url: "#"
    },
    {
      title: "Peer Support Role-Play Examples",
      description: "Video demonstrations of effective peer support conversations",
      type: "Video",
      duration: "28 min",
      icon: <Video className="h-5 w-5" />,
      url: "#"
    },
    {
      title: "Mindfulness for Supporters",
      description: "Guided meditation and mindfulness exercises for peer supporters",
      type: "Audio",
      duration: "18 min",
      icon: <Headphones className="h-5 w-5" />,
      url: "#"
    }
  ];

  const externalLinks = [
    {
      title: "National Suicide Prevention Lifeline",
      description: "24/7 crisis support and resources",
      url: "https://suicidepreventionlifeline.org",
      category: "Crisis Support",
      available: "24/7"
    },
    {
      title: "Crisis Text Line",
      description: "Text-based crisis support and intervention",
      url: "https://crisistextline.org",
      category: "Crisis Support",
      available: "24/7"
    },
    {
      title: "Mental Health America",
      description: "Comprehensive mental health resources and information",
      url: "https://mhanational.org",
      category: "Education",
      available: "Always"
    },
    {
      title: "NAMI (National Alliance on Mental Illness)",
      description: "Support groups, education, and advocacy resources",
      url: "https://nami.org",
      category: "Support Groups",
      available: "Varies"
    },
    {
      title: "SAMHSA Treatment Locator",
      description: "Find mental health and substance abuse treatment facilities",
      url: "https://findtreatment.samhsa.gov",
      category: "Treatment",
      available: "Always"
    }
  ];

  const quickReference = [
    {
      title: "Crisis Hotline Numbers",
      items: [
        "National Suicide Prevention: 988",
        "Crisis Text Line: Text HOME to 741741",
        "SAMHSA Helpline: 1-800-662-4357",
        "Trevor Lifeline (LGBTQ+): 1-866-488-7386"
      ]
    },
    {
      title: "When to Escalate",
      items: [
        "Immediate danger to self or others",
        "Specific suicide plan mentioned",
        "Substance abuse emergency",
        "Psychotic episodes or severe mental break"
      ]
    }
  ];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Essential': 'bg-blue-100 text-blue-800',
      'Critical': 'bg-red-100 text-red-800',
      'Skills': 'bg-green-100 text-green-800',
      'Wellness': 'bg-purple-100 text-purple-800',
      'Education': 'bg-indigo-100 text-indigo-800',
      'Safety': 'bg-red-100 text-red-800',
      'Diversity': 'bg-yellow-100 text-yellow-800',
      'Communication': 'bg-blue-100 text-blue-800',
      'Crisis Support': 'bg-red-100 text-red-800',
      'Support Groups': 'bg-green-100 text-green-800',
      'Treatment': 'bg-purple-100 text-purple-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout currentRole="peer">
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Peer Support Resources</h1>
            <p className="text-gray-600">
              Comprehensive resources, guides, and tools to help you provide effective peer support
            </p>
          </div>

      {/* Quick Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {quickReference.map((section, index) => (
          <Card key={index} className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Training Documents & Guides
          </CardTitle>
          <CardDescription>
            Essential documentation for peer support training and reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentResources.map((doc, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {doc.icon}
                    <Badge className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">{doc.size}</span>
                </div>
                <h3 className="font-semibold mb-2">{doc.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{doc.type}</span>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Articles Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Educational Articles
          </CardTitle>
          <CardDescription>
            In-depth articles on peer support techniques and best practices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getCategoryColor(article.category)}>
                    {article.category}
                  </Badge>
                  {article.featured && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <h3 className="font-semibold mb-2">{article.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{article.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {article.readTime}
                  </div>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Read
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Media Resources Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            Video & Audio Training
          </CardTitle>
          <CardDescription>
            Interactive media resources for skill development and training
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaResources.map((media, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  {media.icon}
                  <Badge variant="outline">{media.type}</Badge>
                  <span className="text-xs text-gray-500 ml-auto">{media.duration}</span>
                </div>
                <h3 className="font-semibold mb-2">{media.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{media.description}</p>
                <Button size="sm" className="w-full flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Resource
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* External Resources Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-6 w-6" />
            External Resources & Support
          </CardTitle>
          <CardDescription>
            Links to external organizations and crisis support services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {externalLinks.map((link, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getCategoryColor(link.category)}>
                    {link.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {link.available}
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{link.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{link.description}</p>
                <Button 
                  size="sm" 
                  className="w-full flex items-center gap-2"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit Website
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Message */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Important Reminder</h4>
            <p className="text-sm text-blue-800">
              Remember that as a peer supporter, you provide valuable emotional support and guidance, 
              but you are not a replacement for professional mental health treatment. Always encourage 
              individuals to seek professional help when needed and don't hesitate to escalate situations 
              that are beyond your scope of support.
            </p>
          </div>
        </div>
      </div>
        </div>
      </div>
    </Layout>
  );
};

export default PeerResourcesPage;