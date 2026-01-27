import { StatusBar } from 'expo-status-bar';
import FaceRecognitionScreen from './components/FaceRecognitionScreen';
import AttendanceScanner from './components/AttendanceScanner';
export default function App() {
  return (
    <>
      <AttendanceScanner />
      {/* <FaceRecognitionScreen /> */}
      <StatusBar style="auto" />
    </>
  );
}
