export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Account not configured
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your account exists but has not been set up with an EduDash role yet.
          Please contact your school administrator to have your profile
          configured before logging in.
        </p>
        <p className="text-xs text-muted-foreground">
          If you believe this is an error, ask your admin to verify that your
          account ID has been added to the staff profiles table with the correct
          role.
        </p>
      </div>
    </div>
  );
}
