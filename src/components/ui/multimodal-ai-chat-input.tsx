'use client';

import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    type Dispatch,
    type SetStateAction,
    memo,
} from 'react';

import equal from 'fast-deep-equal';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp as ArrowUpIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const clsx = (...args: any[]) => args.filter(Boolean).join(' ');

// Type Definitions
export interface Attachment {
    url: string;
    name: string;
    contentType: string;
    size: number;
}

export interface UIMessage {
    id: string;
    content: string;
    role: string;
    attachments?: Attachment[];
}

export type VisibilityType = 'public' | 'private' | 'unlisted' | string;

// Utility Functions
const cn = (...inputs: any[]) => {
    return twMerge(clsx(inputs));
};

// Button variants using cva
const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                // Primary: black background, white text
                default: 'bg-black text-white hover:bg-gray-800',
                // Destructive: high-contrast gray outline, black text
                destructive:
                    'border border-black text-black hover:bg-gray-100',
                // Outline: grayscale border, white background, black text
                outline:
                    'border border-gray-400 bg-white hover:bg-gray-100 hover:text-black',
                // Secondary: grayscale background, gray text
                secondary:
                    'bg-gray-200 text-black hover:bg-gray-300',
                // Ghost: hover effect, default text color (should be black)
                ghost: 'text-black hover:bg-gray-100 hover:text-black', // Explicitly set text to black
                // Link: black text
                link: 'text-black underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

// Button component
interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? 'button' : 'button';

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    },
);
Button.displayName = 'Button';

// Textarea component
const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                // Adjusted text color, placeholder color, and border/ring colors to grayscale
                'flex min-h-[80px] w-full rounded-md border border-gray-400 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-black dark:text-white',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

// Stop Icon SVG (uses currentColor)
const StopIcon = ({ size = 16 }: { size?: number }) => {
    return (
        <svg height={size} viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 3H13V13H3V3Z"
                fill="currentColor"
            />
        </svg>
    );
};

// Sub-Components

interface SuggestedActionsProps {
    chatId: string;
    onSelectAction: (action: string) => void;
    selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
    onSelectAction,
}: SuggestedActionsProps) {
    const suggestedActions = [
        {
            title: 'Analyze my revenue',
            label: 'trends over the last month',
            action: 'Can you analyze my revenue trends over the last month?',
        },
        {
            title: 'Identify high',
            label: 'expense categories',
            action: 'Which categories have the highest expenses in my data?',
        },
        {
            title: 'Calculate my profit',
            label: 'margins for this week',
            action: 'What are my profit margins for the current week based on uploaded reports?',
        },
        {
            title: 'Suggest ways to',
            label: 'optimize efficiency',
            action: 'Based on my data, suggest 3 ways to optimize operational efficiency.',
        },
    ];

    return (
        <div
            data-testid="suggested-actions"
            className="grid pb-4 sm:grid-cols-2 gap-3 w-full"
        >
            <AnimatePresence>
                {suggestedActions.map((suggestedAction, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.05 * index }}
                        key={`suggested-action-${index}`}
                        className={index > 1 ? 'hidden sm:block' : 'block'}
                    >
                        <Button
                            variant="ghost"
                            onClick={() => onSelectAction(suggestedAction.action)}
                            className="text-left border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start
                       bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-all shadow-sm hover:shadow-md"
                        >
                            <span className="font-bold uppercase tracking-tight text-[10px] text-indigo-600 dark:text-indigo-400 mb-1">{suggestedAction.title}</span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                                {suggestedAction.label}
                            </span>
                        </Button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

const SuggestedActions = memo(
    PureSuggestedActions,
    (prevProps, nextProps) => {
        if (prevProps.chatId !== nextProps.chatId) return false;
        if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
            return false;
        return true;
    },
);






function PureStopButton({ onStop }: { onStop: () => void }) {
    return (
        <Button
            data-testid="stop-button"
            className="rounded-full p-2 h-8 w-8 bg-slate-900 border border-black text-white flex items-center justify-center"
            onClick={(event) => {
                event.preventDefault();
                onStop();
            }}
            aria-label="Stop generating"
        >
            <StopIcon size={14} />
        </Button>
    );
}

const StopButton = memo(PureStopButton, (prev, next) => prev.onStop === next.onStop);

function PureSendButton({
    submitForm,
    input,
    uploadQueue,
    attachments,
    canSend,
    isGenerating,
}: {
    submitForm: () => void;
    input: string;
    uploadQueue: Array<string>;
    attachments: Array<Attachment>;
    canSend: boolean;
    isGenerating: boolean;
}) {
    const isDisabled =
        uploadQueue.length > 0 ||
        !canSend ||
        isGenerating ||
        (input.trim().length === 0 && attachments.length === 0);

    return (
        <Button
            data-testid="send-button"
            className="rounded-full p-2 h-8 w-8 bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            onClick={(event) => {
                event.preventDefault();
                if (!isDisabled) {
                    submitForm();
                }
            }}
            disabled={isDisabled}
            aria-label="Send message"
        >
            <ArrowUpIcon size={16} />
        </Button>
    );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length) return false;
    if (prevProps.attachments.length !== nextProps.attachments.length) return false;
    if (prevProps.attachments.length > 0 && !equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.canSend !== nextProps.canSend) return false;
    if (prevProps.isGenerating !== nextProps.isGenerating) return false;
    return true;
});


// Main Component

interface MultimodalInputProps {
    chatId: string;
    messages: Array<UIMessage>;
    attachments: Array<Attachment>;
    setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
    onSendMessage: (params: { input: string; attachments: Attachment[] }) => void;
    onStopGenerating: () => void;
    isGenerating: boolean;
    canSend: boolean;
    className?: string;
    selectedVisibilityType: VisibilityType;
}

function PureMultimodalInput({
    chatId,
    messages,
    attachments,
    setAttachments,
    onSendMessage,
    onStopGenerating,
    isGenerating,
    canSend,
    className,
    selectedVisibilityType,
}: MultimodalInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [input, setInput] = useState('');

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight + 2, 200)}px`;
        }
    };

    const resetHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.rows = 1;
            adjustHeight();
        }
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            adjustHeight();
        }
    }, [input]);

    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
    };



    const submitForm = useCallback(() => {
        if (input.trim().length === 0 && attachments.length === 0) {
            return;
        }

        onSendMessage({ input, attachments });

        setInput('');
        setAttachments([]);

        attachments.forEach(att => {
            if (att.url.startsWith('blob:')) {
                URL.revokeObjectURL(att.url);
            }
        });

        resetHeight();
        textareaRef.current?.focus();

    }, [
        input,
        attachments,
        onSendMessage,
        setAttachments,
        resetHeight,
    ]);

    const showSuggestedActions = messages.length === 0 && attachments.length === 0;



    return (
        <div className={cn("relative w-full flex flex-col gap-4", className)}>

            <AnimatePresence>
                {showSuggestedActions && (
                    <motion.div
                        key="suggested-actions-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <SuggestedActions
                            onSelectAction={(action) => {
                                setInput(action);
                                requestAnimationFrame(() => {
                                    adjustHeight();
                                    textareaRef.current?.focus();
                                });
                            }}
                            chatId={chatId}
                            selectedVisibilityType={selectedVisibilityType}
                        />
                    </motion.div>
                )}
            </AnimatePresence>



            <div className="relative">
                <Textarea
                    data-testid="multimodal-input"
                    ref={textareaRef}
                    placeholder="Ask anything about your data..."
                    value={input}
                    onChange={handleInput}
                    className={cn(
                        'min-h-[56px] max-h-[200px] overflow-y-auto resize-none rounded-[2rem] !text-sm py-4 pl-14 pr-14',
                        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus:border-indigo-400 dark:focus:border-indigo-500 focus:shadow-indigo-100/20 dark:focus:shadow-none text-black dark:text-white',
                        className,
                    )}
                    rows={1}
                    autoFocus
                    disabled={!canSend || isGenerating}
                    onKeyDown={(event) => {
                        if (
                            event.key === 'Enter' &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                        ) {
                            event.preventDefault();
                            const canSubmit = canSend && !isGenerating && (input.trim().length > 0 || attachments.length > 0);
                            if (canSubmit) {
                                submitForm();
                            }
                        }
                    }}
                />



                <div className="absolute right-3 bottom-3 flex items-center z-10">
                    {isGenerating ? (
                        <StopButton onStop={onStopGenerating} />
                    ) : (
                        <SendButton
                            submitForm={submitForm}
                            input={input}
                            uploadQueue={[]}
                            attachments={attachments}
                            canSend={canSend}
                            isGenerating={isGenerating}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export { PureMultimodalInput };
