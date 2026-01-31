import { SignInPage, type Testimonial } from "@/components/ui/sign-in";
import { auth } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const sampleTestimonials: Testimonial[] = [
    {
        avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
        name: "Sarah Chen",
        handle: "@sarahdigital",
        text: "Amazing platform! The user experience is seamless and the features are exactly what I needed."
    },
    {
        avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
        name: "Marcus Johnson",
        handle: "@marcustech",
        text: "This service has transformed how I work. Clean design, powerful features, and excellent support."
    },
    {
        avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
        name: "David Martinez",
        handle: "@davidcreates",
        text: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for productivity."
    },
];

const SignInPageDemo = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message);
            console.error("Sign In Error:", err);
            alert(`Sign In Failed: ${err.message}`);
        }
    };

    const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message);
            console.error("Sign Up Error:", err);
            alert(`Sign Up Failed: ${err.message}`);
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            navigate("/dashboard");
        } catch (err: any) {
            console.error("Google Sign In Error:", err);
            alert(`Google Sign In Failed: ${err.message}`);
        }
    };

    const handleResetPassword = async () => {
        const email = prompt("Please enter your email address to reset password:");
        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Password reset email sent!");
            } catch (err: any) {
                console.error("Reset Password Error:", err);
                alert(`Error: ${err.message}`);
            }
        }
    }

    return (
        <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
            <SignInPage
                heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
                testimonials={sampleTestimonials}
                onSignIn={handleSignIn}
                onSignUp={handleSignUp}
                onGoogleSignIn={handleGoogleSignIn}
                onResetPassword={handleResetPassword}
            />
            {error && <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg">{error}</div>}
        </div>
    );
};

export default SignInPageDemo;
