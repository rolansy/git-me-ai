import React, { useState, useEffect } from 'react';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Paper,
  LinearProgress,
  Alert
} from '@mui/material';
import { BackendWakeupService } from '../services/backendWakeup';

interface BackendWakeupProps {
  onReady?: () => void;
}

const BackendWakeup: React.FC<BackendWakeupProps> = ({ onReady }) => {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wakeUpBackend = async () => {
      setIsWakingUp(true);
      setError(null);

      try {
        const ready = await BackendWakeupService.wakeUpBackend();
        setIsReady(ready);
        
        if (ready && onReady) {
          onReady();
        } else if (!ready) {
          setError('Backend server is taking longer than expected to respond. Please try refreshing the page.');
        }
      } catch {
        setError('Failed to connect to backend server. Please check your internet connection and try again.');
      } finally {
        setIsWakingUp(false);
      }
    };

    wakeUpBackend();
  }, [onReady]);

  if (isReady) {
    return null; // Don't render anything when ready
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Paper 
        elevation={8}
        sx={{ 
          p: 4, 
          textAlign: 'center',
          maxWidth: 400,
          mx: 2,
          borderRadius: 2
        }}
      >
        {isWakingUp ? (
          <>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              🚀 Starting Backend Server
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This might take up to 50 seconds as our free server spins up...
            </Typography>
            <LinearProgress sx={{ mt: 2, mb: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Please wait while we prepare everything for you
            </Typography>
          </>
        ) : error ? (
          <Alert severity="error" sx={{ textAlign: 'left' }}>
            <Typography variant="subtitle2" gutterBottom>
              Connection Error
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        ) : (
          <>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Checking Backend Status...
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default BackendWakeup;
