import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface BiometricCredential {
  id: string;
  type: 'fingerprint' | 'face' | 'webauthn';
  publicKey?: string;
  createdAt: Date;
}

export function useBiometric() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'webauthn' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkBiometricSupport();
    checkEnrollmentStatus();
  }, []);

  const checkBiometricSupport = async () => {
    // Check for WebAuthn support (most modern biometric support)
    if (window.PublicKeyCredential) {
      setIsSupported(true);
      
      // Check platform authenticator availability
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        // Detect biometric type based on user agent and platform
        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
          setBiometricType('face'); // Face ID on iOS
        } else if (navigator.userAgent.includes('Android')) {
          setBiometricType('fingerprint'); // Fingerprint on Android
        } else {
          setBiometricType('webauthn'); // Generic WebAuthn
        }
      }
    }
  };

  const checkEnrollmentStatus = async () => {
    try {
      const response = await fetch('/api/auth/biometric/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsEnrolled(data.enrolled);
      }
    } catch (error) {
      console.error('Failed to check biometric enrollment:', error);
    }
  };

  const enrollBiometric = useCallback(async (userId: number) => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Biometric authentication is not supported on this device.",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsAuthenticating(true);

      // Get challenge from server
      const challengeResponse = await fetch('/api/auth/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });

      if (!challengeResponse.ok) throw new Error('Failed to get challenge');
      
      const { challenge, rpId, rpName } = await challengeResponse.json();

      // Create credentials using WebAuthn
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
          rp: {
            name: rpName || 'STEELIQ',
            id: rpId || window.location.hostname
          },
          user: {
            id: Uint8Array.from(String(userId), c => c.charCodeAt(0)),
            name: `user${userId}`,
            displayName: `User ${userId}`
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'direct'
        }
      }) as PublicKeyCredential;

      if (!credential) throw new Error('Failed to create credential');

      // Send credential to server for storage
      const enrollResponse = await fetch('/api/auth/biometric/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          credentialId: credential.id,
          publicKey: btoa(String.fromCharCode(...new Uint8Array((credential.response as any).publicKey))),
          type: biometricType
        })
      });

      if (!enrollResponse.ok) throw new Error('Failed to enroll biometric');

      setIsEnrolled(true);
      toast({
        title: "Enrollment Successful",
        description: `${biometricType === 'face' ? 'Face ID' : biometricType === 'fingerprint' ? 'Fingerprint' : 'Biometric'} authentication has been enabled.`
      });

      return true;
    } catch (error: any) {
      console.error('Biometric enrollment failed:', error);
      toast({
        title: "Enrollment Failed",
        description: error.message || "Failed to enroll biometric authentication.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported, biometricType, toast]);

  const authenticateWithBiometric = useCallback(async () => {
    if (!isSupported || !isEnrolled) {
      toast({
        title: "Not Available",
        description: "Biometric authentication is not available or not enrolled.",
        variant: "destructive"
      });
      return null;
    }

    try {
      setIsAuthenticating(true);

      // Get challenge from server
      const challengeResponse = await fetch('/api/auth/biometric/challenge', {
        method: 'GET',
        credentials: 'include'
      });

      if (!challengeResponse.ok) throw new Error('Failed to get challenge');
      
      const { challenge, credentialIds } = await challengeResponse.json();

      // Authenticate using stored credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
          allowCredentials: credentialIds.map((id: string) => ({
            id: Uint8Array.from(atob(id), c => c.charCodeAt(0)),
            type: 'public-key',
            transports: ['internal']
          })),
          userVerification: 'required',
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (!assertion) throw new Error('Authentication cancelled');

      // Verify with server
      const verifyResponse = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credentialId: assertion.id,
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array((assertion.response as any).authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array((assertion.response as any).clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array((assertion.response as any).signature)))
        })
      });

      if (!verifyResponse.ok) throw new Error('Verification failed');

      const { user, token } = await verifyResponse.json();

      toast({
        title: "Authentication Successful",
        description: `Welcome back! Authenticated with ${biometricType === 'face' ? 'Face ID' : biometricType === 'fingerprint' ? 'Fingerprint' : 'Biometric'}.`
      });

      return { user, token };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with biometric.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported, isEnrolled, biometricType, toast]);

  const removeBiometric = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/biometric/remove', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to remove biometric');

      setIsEnrolled(false);
      toast({
        title: "Biometric Removed",
        description: "Biometric authentication has been disabled."
      });

      return true;
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: "Failed to remove biometric authentication.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return {
    isSupported,
    isEnrolled,
    isAuthenticating,
    biometricType,
    enrollBiometric,
    authenticateWithBiometric,
    removeBiometric
  };
}