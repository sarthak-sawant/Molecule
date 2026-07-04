import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username?: string;
    role?: "user" | "teacher";
    avatar_url?: string;
    points?: number;
  };
}

class ApiClient {
  private token: string | null = null;

  async init() {
    this.token = await SecureStore.getItemAsync("auth_token");
    if (this.token) {
      try {
        const profile = await this.getMe();
        return profile;
      } catch (error) {
        this.token = null;
        await SecureStore.deleteItemAsync("auth_token");
        return null;
      }
    }
    return null;
  }

  async getMe() {
    const response = await this.request<AuthResponse["user"]>("/auth/me", {});
    return response;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only add Content-Type: application/json if we're not sending FormData
    // Check for both browser FormData and React Native's FormData (has append method)
    const isFormData = options.body && 
      (options.body instanceof FormData || 
       (typeof options.body === 'object' && options.body !== null && 'append' in options.body));
    
    if (options.body && !isFormData) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    console.log(`Calling ${API_URL}${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`Response status: ${response.status}`);
    if (!response.ok) {
      let errorMessage = "Request failed";
      try {
        const errorData = await response.json();
        console.log("Error data:", errorData);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If json() fails, try to get text
        const text = await response.text();
        console.log("Error text:", text);
        errorMessage = text || "Unknown error";
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async signup(
    email: string,
    password: string,
    username?: string,
  ): Promise<void> {
    await this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, username }),
    });
  }

  async signupTeacher(
    email: string,
    password: string,
    username: string,
    teacherSecretCode: string,
  ): Promise<void> {
    await this.request("/auth/signup-teacher", {
      method: "POST",
      body: JSON.stringify({ email, password, username, teacherSecretCode }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      this.token = data.token;
      await SecureStore.setItemAsync("auth_token", data.token);
    }
    return data;
  }

  async logout() {
    this.token = null;
    await SecureStore.deleteItemAsync("auth_token");
  }

  async getToken(): Promise<string | null> {
    return this.token;
  }

  // Groups
  async getGroups() {
    return this.request("/groups");
  }

  async createGroup(name: string, description?: string) {
    return this.request("/groups", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  // Questions
  async getQuestions() {
    return this.request("/questions");
  }

  async getQuestion(id: string) {
    return this.request(`/questions/${id}`);
  }

  async createQuestion(title: string, content: string, group_id?: string) {
    return this.request("/questions", {
      method: "POST",
      body: JSON.stringify({ title, content, group_id }),
    });
  }

  async deleteQuestion(id: string) {
    return this.request(`/questions/${id}`, {
      method: "DELETE",
    });
  }

  // Answers
  async getAnswers(questionId: string) {
    return this.request(`/questions/${questionId}/answers`);
  }

  async createAnswer(questionId: string, content: string) {
    return this.request(`/questions/${questionId}/answers`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async updateAnswer(id: string, content: string) {
    return this.request(`/answers/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  async deleteAnswer(id: string) {
    return this.request(`/answers/${id}`, {
      method: "DELETE",
    });
  }

  async acceptAnswer(id: string) {
    return this.request(`/answers/${id}/accept`, {
      method: "POST",
    });
  }

  // Upvotes
  async getUpvotes(answerId: string) {
    return this.request(`/answers/${answerId}/upvotes`);
  }

  async upvoteAnswer(answerId: string) {
    return this.request(`/answers/${answerId}/upvotes`, {
      method: "POST",
    });
  }

  async removeUpvote(answerId: string) {
    return this.request(`/answers/${answerId}/upvotes`, {
      method: "DELETE",
    });
  }

  // Profiles
  async getProfile(id: string) {
    return this.request(`/profiles/${id}`);
  }

  async updateProfile(
    id: string,
    updates: { username?: string; avatar_url?: string },
  ) {
    return this.request(`/profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Knowledge Base
  async getKnowledgeBase() {
    return this.request("/knowledge-base");
  }

  async createKnowledgeBaseEntry(title: string, description?: string, category?: string, pdf_url?: string, file?: any) {
    const formData = new FormData();
    formData.append("title", title);
    if (description) formData.append("description", description);
    if (category) formData.append("category", category);
    if (pdf_url) formData.append("pdf_url", pdf_url);
    if (file) {
      // @ts-ignore - React Native FormData requires this format
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      });
    }
    return this.request("/knowledge-base", {
      method: "POST",
      body: formData,
    });
  }

  async updateKnowledgeBaseEntry(
    id: string,
    entry: {
      title: string;
      description?: string;
      category: string;
      pdf_url: string;
    },
  ) {
    return this.request(`/knowledge-base/${id}`, {
      method: "PUT",
      body: JSON.stringify(entry),
    });
  }

  // Notices
  async getNotices() {
    return this.request("/notices");
  }

  async createNotice(title: string, content: string, file?: any) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (file) {
      // @ts-ignore - React Native FormData requires this format
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      });
    }
    return this.request("/notices", {
      method: "POST",
      body: formData,
    });
  }

  async deleteNotice(id: string) {
    return this.request(`/notices/${id}`, {
      method: "DELETE",
    });
  }
}

export const api = new ApiClient();
