
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Search, FileBadge, User, Settings, 
  BookOpen, MessageCircleQuestion, HelpCircle, Lightbulb 
} from "lucide-react";

const Help: React.FC = () => {
  return (
    <div className="container py-6 animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 text-primary">Help Center</h1>
      
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="mb-6 bg-background/50 p-1 gap-2 flex-wrap">
          <TabsTrigger value="search" className="gap-2">
            <Search size={16} />
            <span>Job Search</span>
          </TabsTrigger>
          <TabsTrigger value="resume" className="gap-2">
            <FileBadge size={16} />
            <span>Resume</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User size={16} />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings size={16} />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="tips" className="gap-2">
            <Lightbulb size={16} />
            <span>Tips</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <MessageCircleQuestion size={16} />
            <span>FAQ</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-250px)] rounded-md border p-4">
          <TabsContent value="search" className="space-y-6">
            <HelpSection 
              title="Job Search Features"
              description="Learn how to use the powerful job search features to find your next opportunity."
              image="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80"
            >
              <HelpCard
                title="Boolean Search Queries"
                steps={[
                  "Select relevant terms on the left panel to build your search query",
                  "Click 'Generate Query' to create a boolean search string",
                  "The query will appear in the search box",
                  "Click 'Search' to find matching jobs"
                ]}
              />
              
              <HelpCard
                title="External Job Board Search"
                steps={[
                  "After generating a query, click 'External Search' to open results in your selected job board",
                  "Use 'Open Selected' to open results in all selected job boards",
                  "Select specific job boards under the tabs below to search by region"
                ]}
              />
              
              <HelpCard
                title="Saving Job Listings"
                steps={[
                  "When you find an interesting job, click the bookmark icon",
                  "The job will be saved to your profile",
                  "View all saved jobs in your Profile section",
                  "You must be logged in to save jobs"
                ]}
              />
            </HelpSection>
          </TabsContent>

          <TabsContent value="resume" className="space-y-6">
            <HelpSection 
              title="Resume Management"
              description="Upload, analyze, and optimize your resume for better job matches."
              image="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80"
            >
              <HelpCard
                title="Resume Upload"
                steps={[
                  "Go to the Resume page",
                  "Click 'Upload Resume' to select your PDF or Word document",
                  "The system will parse your resume automatically",
                  "Review extracted information for accuracy"
                ]}
              />
              
              <HelpCard
                title="Resume Analysis"
                steps={[
                  "After uploading, click 'Analyze Resume'",
                  "The system will identify key skills and experience",
                  "You'll receive suggestions for improvement",
                  "Keywords from your resume will be added to your search profile"
                ]}
              />
              
              <HelpCard
                title="Keyword Matching"
                steps={[
                  "View how your resume keywords match with job postings",
                  "Add missing keywords to improve match rates",
                  "Higher match percentages indicate better job fits",
                  "Update your resume based on these insights"
                ]}
              />
            </HelpSection>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <HelpSection 
              title="Profile Management"
              description="Manage your personal profile, saved jobs, and application history."
              image="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80"
            >
              <HelpCard
                title="Account Setup"
                steps={[
                  "Navigate to the Profile page",
                  "Complete all required fields in your profile",
                  "Add professional details like skills and experience",
                  "Upload a profile photo (optional)"
                ]}
              />
              
              <HelpCard
                title="Saved Jobs"
                steps={[
                  "View all jobs you've saved from search results",
                  "Click on any saved job to see full details",
                  "Remove jobs you're no longer interested in",
                  "Track application status for each saved job"
                ]}
              />
              
              <HelpCard
                title="Application Tracking"
                steps={[
                  "Mark jobs as 'Applied' when you submit applications",
                  "Set reminders for follow-ups",
                  "Track interview schedules",
                  "Log all communication with employers"
                ]}
              />
            </HelpSection>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <HelpSection 
              title="System Settings"
              description="Customize your experience and manage your account settings."
              image="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80"
            >
              <HelpCard
                title="Theme Settings"
                steps={[
                  "Go to the Settings page",
                  "Toggle between Light and Dark mode",
                  "Changes are saved automatically",
                  "Theme preference is remembered for future visits"
                ]}
              />
              
              <HelpCard
                title="Job Board API Keys"
                steps={[
                  "Add API keys for premium job boards",
                  "Enable advanced search features",
                  "API keys are securely stored",
                  "Manage and update keys anytime"
                ]}
              />
              
              <HelpCard
                title="Notification Preferences"
                steps={[
                  "Choose which notifications you want to receive",
                  "Set frequency of job alerts",
                  "Configure email notification settings",
                  "Enable browser notifications for real-time updates"
                ]}
              />
            </HelpSection>
          </TabsContent>

          <TabsContent value="tips" className="space-y-6">
            <HelpSection 
              title="Job Search Tips"
              description="Expert advice to help you optimize your job search and stand out to employers."
              image="https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=800&q=80"
            >
              <HelpCard
                title="Effective Boolean Queries"
                steps={[
                  "Combine multiple skills with OR operators",
                  "Use quotes for exact phrase matching",
                  "Exclude irrelevant results with NOT operators",
                  "Prioritize your strongest skills first"
                ]}
              />
              
              <HelpCard
                title="Resume Optimization"
                steps={[
                  "Tailor your resume for each job application",
                  "Include keywords from the job description",
                  "Quantify achievements where possible",
                  "Keep formatting clean and professional"
                ]}
              />
              
              <HelpCard
                title="Interview Preparation"
                steps={[
                  "Research the company thoroughly before interviews",
                  "Prepare answers for common questions",
                  "Have examples ready that demonstrate your skills",
                  "Prepare thoughtful questions to ask interviewers"
                ]}
              />
            </HelpSection>
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <HelpSection 
              title="Frequently Asked Questions"
              description="Answers to common questions about AutoSearchPro features and functionality."
              image=""
            >
              <div className="space-y-4">
                <FaqItem 
                  question="How do I reset my password?"
                  answer="Go to the Settings page and click on 'Change Password'. You'll need to enter your current password and then your new password twice to confirm. If you've forgotten your password, use the 'Forgot Password' link on the login page."
                />
                
                <FaqItem 
                  question="Can I use AutoSearchPro without creating an account?"
                  answer="Yes, you can use basic search features without an account. However, to save jobs, track applications, or use advanced features, you'll need to create a free account."
                />
                
                <FaqItem 
                  question="How are my search results generated?"
                  answer="AutoSearchPro uses a combination of direct API connections to job boards and intelligent search algorithms. Results are based on keyword matching, relevance scoring, and your previous search patterns if you're logged in."
                />
                
                <FaqItem 
                  question="Is my personal information secure?"
                  answer="Yes, we take security seriously. All personal data is encrypted, and we never share your information with third parties without your consent. API keys are stored using secure encryption standards."
                />
                
                <FaqItem 
                  question="How do I delete my account?"
                  answer="To delete your account, go to Settings > Account > Delete Account. Please note that this action is permanent and will remove all your saved jobs, searches, and personal information from our system."
                />
              </div>
            </HelpSection>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

// Helper Components
interface HelpSectionProps {
  title: string;
  description: string;
  image: string;
  children: React.ReactNode;
}

const HelpSection: React.FC<HelpSectionProps> = ({ 
  title, 
  description, 
  image, 
  children 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-primary mb-2">{title}</h2>
          <p className="text-muted-foreground mb-4">{description}</p>
        </div>
        {image && (
          <div className="w-full md:w-1/3">
            <img 
              src={image} 
              alt={title} 
              className="rounded-lg shadow-md border border-border"
            />
          </div>
        )}
      </div>
      <Separator className="my-4" />
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

interface HelpCardProps {
  title: string;
  steps: string[];
}

const HelpCard: React.FC<HelpCardProps> = ({ title, steps }) => {
  return (
    <Card className="p-4 cyber-card">
      <h3 className="text-lg font-medium mb-3 text-primary">{title}</h3>
      <ol className="list-decimal pl-5 space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="text-sm">{step}</li>
        ))}
      </ol>
    </Card>
  );
};

interface FaqItemProps {
  question: string;
  answer: string;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
  return (
    <Card className="p-4 cyber-card">
      <h3 className="text-lg font-medium mb-2 text-primary">{question}</h3>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </Card>
  );
};

export default Help;
