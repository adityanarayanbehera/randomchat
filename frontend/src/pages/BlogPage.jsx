// frontend/src/pages/BlogPage.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  MessageCircle, 
  Shield, 
  Users, 
  Zap, 
  Heart,
  Lock,
  Globe,
  Video,
  Star,
  CheckCircle
} from "lucide-react";

export default function BlogPage() {
  useEffect(() => {
    // Set SEO meta tags directly
    document.title = "Best Random Chat App 2025 - Chat with Strangers Online Safely | Free Anonymous Video Chat";
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Discover the best random chat app to meet new people online. Safe, anonymous video chat with strangers. Free Omegle alternative with privacy protection. Start chatting now!");
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Discover the best random chat app to meet new people online. Safe, anonymous video chat with strangers. Free Omegle alternative with privacy protection. Start chatting now!";
      document.head.appendChild(meta);
    }
    
    // Set keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", "random chat, chat with strangers, meet new people online, anonymous chat, Omegle alternative, random video chat, talk to strangers online free, best random chat app, stranger chat, random chat without registration");
    } else {
      const meta = document.createElement('meta');
      meta.name = "keywords";
      meta.content = "random chat, chat with strangers, meet new people online, anonymous chat, Omegle alternative, random video chat, talk to strangers online free, best random chat app, stranger chat, random chat without registration";
      document.head.appendChild(meta);
    }
    
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <section className="pt-20 pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Best Random Chat App 2025:<br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Meet Strangers Online Safely
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Discover the most secure way to <strong>chat with strangers</strong>, make new friends, 
                and find the best <strong>Omegle alternatives</strong> in 2025.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 pb-20">
          <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12">
            
            {/* Table of Contents */}
            <div className="bg-blue-50 dark:bg-gray-700 rounded-xl p-6 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">📑 Table of Contents</h2>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• <a href="#what-is-random-chat" className="hover:text-blue-600">What is Random Chat?</a></li>
                <li>• <a href="#best-apps" className="hover:text-blue-600">Why Choose R-Chat?</a></li>
                <li>• <a href="#safety-tips" className="hover:text-blue-600">Safety Tips for Online Chatting</a></li>
                <li>• <a href="#features" className="hover:text-blue-600">Key Features</a></li>
                <li>• <a href="#faqs" className="hover:text-blue-600">Frequently Asked Questions</a></li>
              </ul>
            </div>

            {/* Section 1 */}
            <section id="what-is-random-chat" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                What is Random Chat? 🎲
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                <strong>Random chat</strong> connects you with people from around the world instantly. 
                Whether you're looking to make friends, practice a new language, or just have fun conversations, 
                our platform offers a secure space to interact anonymously.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-6 rounded-xl">
                  <Users className="text-blue-600 dark:text-blue-300 mb-3" size={32} />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Active Community</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Meet friendly people</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 p-6 rounded-xl">
                  <Globe className="text-purple-600 dark:text-purple-300 mb-3" size={32} />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Global Connections</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Chat across borders</p>
                </div>
                <div className="bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900 dark:to-pink-800 p-6 rounded-xl">
                  <Zap className="text-pink-600 dark:text-pink-300 mb-3" size={32} />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Fast Matching</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Connect in seconds</p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section id="best-apps" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                🏆 Why R-Chat is the Best Choice
              </h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8 mb-6 border-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Star className="text-yellow-500 mr-2" fill="currentColor" size={28} />
                    #1. R-Chat (Our Platform)
                  </h3>
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold">
                    RECOMMENDED ⭐
                  </span>
                </div>
                
                <p className="text-lg text-gray-700 dark:text-gray-200 mb-4">
                  <strong>R-Chat</strong> is designed for modern social connection. We focus on 
                  <strong> security, anonymity, and ease of use</strong>. No complicated sign-ups, just pure connection.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-gray-900 dark:text-white">Anonymous Chat</strong>
                      <p className="text-sm text-gray-600 dark:text-gray-300">No login required to start</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-gray-900 dark:text-white">Smart Matching</strong>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Find partners instantly</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-gray-900 dark:text-white">Image Sharing</strong>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Share photos securely</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-gray-900 dark:text-white">Free Forever</strong>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Core features are free</p>
                    </div>
                  </div>
                </div>

                <Link 
                  to="/signup" 
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition"
                >
                  Start Chatting Now →
                </Link>
              </div>
            </section>

            {/* Section 3 */}
            <section id="features" className="mb-12">
               <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                ✨ Key Features
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                   <Users className="text-blue-500 mb-3" size={32} />
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white">Friend System</h3>
                   <p className="text-gray-600 dark:text-gray-300 mt-2">
                     Easily add people you like as friends. Build your own network and chat anytime.
                   </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                   <Users className="text-green-500 mb-3" size={32} />
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white">Group Chats</h3>
                   <p className="text-gray-600 dark:text-gray-300 mt-2">
                     Create private or public groups. Connect with communities that share your interests.
                   </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                   <Shield className="text-red-500 mb-3" size={32} />
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white">Safety Tools</h3>
                   <p className="text-gray-600 dark:text-gray-300 mt-2">
                     Robust reporting and blocking tools to ensure a safe environment for everyone.
                   </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                   <Zap className="text-yellow-500 mb-3" size={32} />
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white">Modern UI</h3>
                   <p className="text-gray-600 dark:text-gray-300 mt-2">
                     Clean, dark-mode supported interface that works perfectly on mobile and desktop.
                   </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="safety-tips" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                🛡️ Staying Safe Online
              </h2>
              
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                Your safety is our priority. Here are some tips to have the best experience:
              </p>

              <div className="space-y-4">
                {[
                  { title: "Keep Personal Info Private", desc: "Avoid sharing your full name, address, or phone number with strangers." },
                  { title: "Report Inappropriate Behavior", desc: "Use our built-in report system if someone makes you uncomfortable." },
                  { title: "Be Kind and Respectful", desc: "Treat others how you want to be treated. Kindness makes chatting better." },
                  { title: "Trust Your Instincts", desc: "If a conversation feels wrong, you can simply skip to the next person." },
                ].map((tip, index) => (
                  <div key={index} className="flex items-start space-x-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <Shield className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" size={24} />
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">{index + 1}. {tip.title}</h4>
                      <p className="text-gray-700 dark:text-gray-300">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQs */}
            <section id="faqs" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                ❓ Frequently Asked Questions
              </h2>
              
              <div className="space-y-4">
                {[
                  {
                    q: "Is R-Chat free to use?",
                    a: "Yes! R-Chat is free to use for random text chats and basic features."
                  },
                  {
                    q: "Do I need to register?",
                    a: "No registration is required to start chatting randomly. You can sign up to save friends and join groups."
                  },
                  {
                    q: "Can I use it on my phone?",
                    a: "Absolutely! Our website is fully mobile-responsive and works great on iOS and Android browsers."
                  },
                  {
                    q: "How do I add friends?",
                    a: "If you have a great conversation, you can send a friend request directly from the chat window."
                  }
                ].map((faq, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{faq.q}</h4>
                    <p className="text-gray-700 dark:text-gray-300">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Chatting?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join the community and meet someone new today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/signup"
                  className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition"
                >
                  Start Chatting
                </Link>
                <Link 
                  to="/features"
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-blue-600 transition"
                >
                  View Features
                </Link>
              </div>
            </section>

          </article>

          {/* Footer SEO Links */}
          <div className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-4">
              <strong>Related searches:</strong> random chat, talk to strangers, anonymous chat, 
              online chat rooms, meet new people, social chat, free chat app
            </p>
            <p>
              © 2025 R-Chat. All rights reserved.
            </p>
          </div>
        </div>
      </div>
  );
}

