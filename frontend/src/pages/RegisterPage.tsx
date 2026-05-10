import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/auth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

interface FormValues { name: string; email: string; password: string; confirm: string }

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (v: FormValues) => authApi.register({ name: v.name, email: v.email, password: v.password }),
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      navigate("/");
      toast.success("Welcome aboard!");
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Registration failed"),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">TodoApp</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Create a new account</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Your Name"
              {...register("name", { required: "Name is required" })}
              error={errors.name?.message}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              {...register("email", { required: "Email is required" })}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              {...register("password", { required: "Password is required", minLength: { value: 6, message: "At least 6 characters" } })}
              error={errors.password?.message}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register("confirm", {
                required: "Please confirm your password",
                validate: (v) => v === watch("password") || "Passwords don't match",
              })}
              error={errors.confirm?.message}
            />
            <Button type="submit" loading={mutation.isPending} className="w-full">
              Sign Up
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
