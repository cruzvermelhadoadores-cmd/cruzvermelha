const EMAIL_API_BASE = "https://script.google.com/macros/s/AKfycbzUXA3hswDOAbXyPyOf00gYEP_9nswtXYP3Zg4U4GOfaVai-th9yr3rmfatUwNSqiJnYQ/exec";

export async function sendProvisionalPassword(email: string, userName: string, password: string): Promise<void> {
  const url = new URL(EMAIL_API_BASE);
  url.searchParams.append("tipo", "senha");
  url.searchParams.append("email", email);
  url.searchParams.append("user", userName);
  url.searchParams.append("senhaprovisoria", password);
  
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to send provisional password email");
  }
}

export async function sendWelcomeEmail(email: string, userName: string): Promise<void> {
  const url = new URL(EMAIL_API_BASE);
  url.searchParams.append("tipo", "bemvindo");
  url.searchParams.append("email", email);
  url.searchParams.append("user", userName);
  
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to send welcome email");
  }
}

export async function sendPasswordRecovery(email: string, userName: string, token: string): Promise<void> {
  const url = new URL(EMAIL_API_BASE);
  url.searchParams.append("tipo", "recuperar");
  url.searchParams.append("email", email);
  url.searchParams.append("user", userName);
  url.searchParams.append("token", token); // Include the recovery token
  
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to send password recovery email");
  }
}