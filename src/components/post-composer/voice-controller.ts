import type { MdDropdown } from '../md/md-dropdown';
import {
  isAudioTranscriptionAvailable,
  transcribeAudio,
} from '../../services/ai';

export interface VoiceControllerState {
  isRecording: boolean;
  isTranscribing: boolean;
  speechToTextAvailable: boolean;
  useNativeSpeech: boolean;
}

export interface VoiceControllerHost {
  getState: () => VoiceControllerState;
  setState: (patch: Partial<VoiceControllerState>) => void;
  getNativeTextArea: () => HTMLTextAreaElement | null;
  getStatusText: () => string;
  setStatusText: (text: string) => void;
  getMoreOptionsDropdown: () => MdDropdown | undefined;
}

export class PostComposerVoiceController {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private nativeSpeechPromise: Promise<string> | null = null;
  private nativeSpeechPartialCleanup: (() => void) | null = null;

  constructor(private host: VoiceControllerHost) {}

  async init() {
    let speechToTextAvailable = isAudioTranscriptionAvailable();
    let useNativeSpeech = false;

    try {
      const { isNativeSpeechRecognitionAvailable } =
        await import('../../services/native-ai.js');
      useNativeSpeech = await isNativeSpeechRecognitionAvailable();
      if (useNativeSpeech) {
        speechToTextAvailable = true;
      }
    } catch {
      // Not on native Android, use web fallback
    }

    this.host.setState({
      speechToTextAvailable,
      useNativeSpeech,
    });
  }

  async toggleRecording() {
    const { isRecording } = this.host.getState();
    if (isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    const { useNativeSpeech } = this.host.getState();
    const dropdown = this.host.getMoreOptionsDropdown();

    try {
      if (dropdown) {
        dropdown.keepOpen = true;
      }

      if (useNativeSpeech) {
        const { nativeStartSpeechRecognition, addNativeSpeechPartialListener } =
          await import('../../services/native-ai.js');
        this.host.setState({ isRecording: true });

        const nativeTextArea = this.host.getNativeTextArea();
        const baseText = nativeTextArea?.value ?? this.host.getStatusText();

        addNativeSpeechPartialListener((partial) => {
          const nextValue =
            baseText.trim().length > 0 ? baseText + ' ' + partial : partial;
          if (nativeTextArea) {
            nativeTextArea.value = nextValue;
          }
          this.host.setStatusText(nextValue);
        }).then((cleanup) => {
          this.nativeSpeechPartialCleanup = cleanup;
        });

        this.nativeSpeechPromise = nativeStartSpeechRecognition();
        this.nativeSpeechPromise
          .then((text) => {
            this.nativeSpeechPartialCleanup?.();
            this.nativeSpeechPartialCleanup = null;
            this.nativeSpeechPromise = null;
            this.host.setState({ isRecording: false });
            if (dropdown) {
              dropdown.keepOpen = false;
              dropdown.hide();
            }
            if (text) {
              const currentText = baseText;
              const nextValue =
                currentText.trim().length > 0 ? currentText + ' ' + text : text;
              if (nativeTextArea) {
                nativeTextArea.value = nextValue;
              }
              this.host.setStatusText(nextValue);
            }
          })
          .catch((err) => {
            console.error('Native speech recognition failed:', err);
            this.nativeSpeechPartialCleanup?.();
            this.nativeSpeechPartialCleanup = null;
            this.nativeSpeechPromise = null;
            this.host.setState({ isRecording: false });
            if (dropdown) {
              dropdown.keepOpen = false;
              dropdown.hide();
            }
          });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });

      this.audioChunks = [];

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const options: MediaRecorderOptions = selectedMimeType
        ? { mimeType: selectedMimeType }
        : {};

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        await this.handleTranscription(audioBlob);
      };

      this.mediaRecorder.start(250);
      this.host.setState({ isRecording: true });
    } catch (error) {
      if (dropdown) {
        dropdown.keepOpen = false;
      }
      console.error('Failed to start recording:', error);
    }
  }

  async stopRecording() {
    const { useNativeSpeech } = this.host.getState();
    const dropdown = this.host.getMoreOptionsDropdown();

    if (useNativeSpeech && this.nativeSpeechPromise) {
      try {
        const { nativeStopSpeechRecognition } =
          await import('../../services/native-ai.js');
        await nativeStopSpeechRecognition();
      } catch (err) {
        console.error('Failed to stop native speech recognition:', err);
        this.nativeSpeechPartialCleanup?.();
        this.nativeSpeechPartialCleanup = null;
        if (dropdown) {
          dropdown.keepOpen = false;
          dropdown.hide();
        }
      }
      this.host.setState({ isRecording: false });
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.host.setState({ isRecording: false });
    }
  }

  async handleTranscription(audioBlob: Blob) {
    this.host.setState({ isTranscribing: true });
    const dropdown = this.host.getMoreOptionsDropdown();

    try {
      const transcribedText = await transcribeAudio(audioBlob);

      if (transcribedText) {
        const currentText = this.host.getStatusText();
        const nextValue =
          currentText.trim().length > 0
            ? currentText + ' ' + transcribedText
            : transcribedText;

        const nativeTextArea = this.host.getNativeTextArea();
        if (nativeTextArea) {
          nativeTextArea.value = nextValue;
        }
        this.host.setStatusText(nextValue);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      this.host.setState({ isTranscribing: false });
      if (dropdown) {
        dropdown.keepOpen = false;
        dropdown.hide();
      }
    }
  }

  destroy() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.nativeSpeechPartialCleanup?.();
    this.nativeSpeechPartialCleanup = null;
  }
}
