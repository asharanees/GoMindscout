import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GroupSessionCard from "@/components/GroupSessionCard";
import CourseCard from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListGroupSessions, useListCourses, getListGroupSessionsQueryKey, getListCoursesQueryKey } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState("masterclasses");
  const [levelFilter, setLevelFilter] = useState("all");
  
  const { data: sessionData, isLoading: sessionsLoading } = useListGroupSessions(
    { isMasterclass: true },
    { query: { queryKey: getListGroupSessionsQueryKey({ isMasterclass: true }) } }
  );
  
  const { data: courseData, isLoading: coursesLoading } = useListCourses(
    {},
    { query: { queryKey: getListCoursesQueryKey({}) } }
  );

  const sessions = sessionData?.sessions ?? [];
  const courses = courseData?.courses ?? [];

  const filteredSessions = sessions.filter(s =>
    s.status !== "completed" &&
    (levelFilter === "all" || s.level === levelFilter)
  );
  const filteredCourses = courses.filter(c =>
    c.status !== "archived" &&
    (levelFilter === "all" || c.level === levelFilter)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="bg-primary/5 border-b border-border py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[150%] bg-primary rounded-full blur-[120px]" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[150%] bg-secondary rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-4xl font-extrabold text-foreground mb-4 tracking-tight">Learn from the Best</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Join live masterclasses and cohort-based courses taught by industry leaders. 
            Level up your skills with real-time feedback and a community of peers.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="masterclasses" className="text-sm font-medium" data-testid="tab-masterclasses">
                Masterclasses
              </TabsTrigger>
              <TabsTrigger value="courses" className="text-sm font-medium" data-testid="tab-courses">
                Courses
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[180px]" data-testid="filter-level">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
              <SelectItem value="All Levels">All Levels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeTab === "masterclasses" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Upcoming Masterclasses</h2>
            {sessionsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border/50">
                <p className="text-muted-foreground">No masterclasses available right now.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSessions.map((session) => (
                  <GroupSessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "courses" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Cohort-Based Courses</h2>
            {coursesLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border/50">
                <p className="text-muted-foreground">No courses available right now.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}