'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(2, {
    message: "Password must be at least 2 characters.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const formData = new URLSearchParams();
      formData.append('username', values.username);
      formData.append('password', values.password);

      const response = await api.post('/auth/login', formData, {
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
          }
      });
      
      const { access_token } = response.data;
      setToken(access_token);
      router.push('/dashboard');
    } catch (error) {
      console.error("Login failed", error);
      form.setError('root', { message: 'Credenciais inválidas' });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Login SistemaMRK</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Usuário</FormLabel>
                        <FormControl>
                            <Input placeholder="admin" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="*****" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {form.formState.errors.root && <div className="text-red-500 text-sm">{form.formState.errors.root.message}</div>}
                    <Button type="submit" className="w-full">Entrar</Button>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}

