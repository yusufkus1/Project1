import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: () => toast.error("Something went wrong"),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Sent</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A password reset link has been sent to your email address.
              </p>
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-sm">
                Back to sign in
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Enter your email and we'll send you a reset link
                </p>
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={!email}
                className="w-full"
              >
                Send Reset Link
              </Button>
              <Link to="/login" className="block text-center text-sm text-gray-500 dark:text-gray-400 hover:underline">
                Go back
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
