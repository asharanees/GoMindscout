import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import MentorsPage from "@/pages/mentors";
import MentorProfilePage from "@/pages/mentor-profile";
import BookingPage from "@/pages/booking";
import PaymentSuccessPage from "@/pages/payment-success";
import PaymentCancelPage from "@/pages/payment-cancel";
import DashboardPage from "@/pages/dashboard";
import MentorDashboardPage from "@/pages/mentor-dashboard";
import MentorOnboardingPage from "@/pages/mentor-onboarding";
import MentorProfileEditPage from "@/pages/mentor-profile-edit";
import AdminPage from "@/pages/admin";
import AdminLoginPage from "@/pages/admin-login";
import AboutPage from "@/pages/about";
import HowItWorksPage from "@/pages/how-it-works";
import BecomeAMentorPage from "@/pages/become-a-mentor";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import ContactPage from "@/pages/contact";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/mentors" component={MentorsPage} />
          <Route path="/mentors/:id" component={MentorProfilePage} />
          <Route path="/book/:packageId" component={BookingPage} />
          <Route path="/payment/success" component={PaymentSuccessPage} />
          <Route path="/payment/cancel" component={PaymentCancelPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/mentor/dashboard" component={MentorDashboardPage} />
          <Route path="/mentor/onboarding" component={MentorOnboardingPage} />
          <Route path="/mentor/profile/edit" component={MentorProfileEditPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin-login" component={AdminLoginPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/become-a-mentor" component={BecomeAMentorPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
