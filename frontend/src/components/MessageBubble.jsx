/**
 * MessageBubble Component
 * Chat message display with high contrast and accessible text
 */

export default function MessageBubble({ role, content }) {
    const isUser = role === 'user';

    // Format content with line breaks and emphasis
    const formatContent = (text) => {
        const lines = text.split('\n');

        return lines.map((line, index) => {
            // Handle bullet points
            if (line.trim().startsWith('•')) {
                return (
                    <li key={index} className="ml-4 list-none flex items-start gap-2">
                        <span className="text-accent-500">•</span>
                        <span>{line.replace('•', '').trim()}</span>
                    </li>
                );
            }

            // Handle bold text (between **)
            if (line.includes('**')) {
                const parts = line.split('**');
                return (
                    <p key={index} className={index > 0 ? 'mt-2' : ''}>
                        {parts.map((part, i) =>
                            i % 2 === 1 ? (
                                <strong key={i} className="font-bold">{part}</strong>
                            ) : (
                                <span key={i}>{part}</span>
                            )
                        )}
                    </p>
                );
            }

            // Regular line
            if (line.trim()) {
                return <p key={index} className={index > 0 ? 'mt-2' : ''}>{line}</p>;
            }

            return null;
        });
    };

    return (
        <div
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            role="article"
            aria-label={isUser ? 'Mensaje del usuario' : 'Mensaje de IDENTIA'}
        >
            <div
                className={`
          max-w-[85%] p-4 text-accessible-base
          ${isUser ? 'message-user' : 'message-assistant'}
        `}
            >
                {/* Sender icon for assistant */}
                {!isUser && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <span className="text-lg">🤖</span>
                        <span className="font-semibold text-primary-500">IDENTIA</span>
                    </div>
                )}

                {/* Message content */}
                <div className="space-y-1">
                    {formatContent(content)}
                </div>
            </div>
        </div>
    );
}
