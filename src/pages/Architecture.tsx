import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, GitBranch, ExternalLink, ClipboardList, Users } from "lucide-react";

const Architecture = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">System Architecture</h1>
          <p className="text-muted-foreground">
            Technical documentation and system diagrams for the Insurance/Warranty Management Platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-5 w-5 text-primary" />
                <CardTitle>Architecture Diagrams</CardTitle>
              </div>
              <CardDescription>
                Interactive Mermaid diagrams showing system architecture, database schema, authentication flow, and business workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                className="w-full"
              >
                <a 
                  href="/architecture-diagram.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  View Diagrams
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>System Documentation</CardTitle>
              </div>
              <CardDescription>
                Comprehensive documentation covering components, database schema, security, edge functions, and deployment architecture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                className="w-full"
              >
                <a 
                  href="/system-architecture.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  View Documentation
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <CardTitle>Functional Requirements</CardTitle>
              </div>
              <CardDescription>
                Complete functional requirements document covering all features, use cases, and business rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                className="w-full"
              >
                <a 
                  href="/FUNCTIONAL_REQUIREMENTS.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  View Requirements
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>User Stories</CardTitle>
              </div>
              <CardDescription>
                Agile-style user stories organized by persona with acceptance criteria and priorities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                className="w-full"
              >
                <a 
                  href="/USER_STORIES.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  View User Stories
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>
              Interactive API reference for edge functions and backend services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              asChild 
              variant="outline"
              className="w-full"
            >
              <a 
                href="/api-documentation.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                View API Docs
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Architecture;
