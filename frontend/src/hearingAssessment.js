import React from 'react';
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";

const HearingAssessment = ({ formData, setFormData, errors }) => {
  const hearingTestType = formData.researchData?.hearingTestType || '';

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'hearingTestType') {
      setFormData(prev => ({
        ...prev,
        researchData: {
          ...prev.researchData,
          hearingTestType: value,
          // Reset values when changing test type
          ...(value !== 'Full Threshold Testing' && { hearingThresholds: [] }),
          ...(value !== 'Hearing Screened' && { hearingScreenResult: '' })
        }
      }));
    } else if (name === 'hearingScreenResult') {
      setFormData(prev => ({
        ...prev,
        researchData: {
          ...prev.researchData,
          hearingScreenResult: value
        }
      }));
    } else if (name.startsWith('threshold')) {
      // Format: threshold_250_rightEar
      const [_, frequency, ear] = name.split('_');

      setFormData(prev => {
        // Find if this threshold already exists
        const thresholds = [...(prev.researchData?.hearingThresholds || [])];
        const existingIndex = thresholds.findIndex(t => t.frequency === parseInt(frequency));

        if (existingIndex >= 0) {
          // Update existing threshold
          thresholds[existingIndex] = {
            ...thresholds[existingIndex],
            [ear]: value === '' ? undefined : parseInt(value)
          };
        } else {
          // Add new threshold
          thresholds.push({
            frequency: parseInt(frequency),
            [ear]: value === '' ? undefined : parseInt(value)
          });
        }

        return {
          ...prev,
          researchData: {
            ...prev.researchData,
            hearingThresholds: thresholds
          }
        };
      });
    }
  };

  // Helper to get threshold value
  const getThresholdValue = (frequency, ear) => {
    const threshold = formData.researchData?.hearingThresholds?.find(
      t => t.frequency === frequency
    );
    return threshold?.[ear] !== undefined ? threshold[ear] : '';
  };

  return (
    <div className="space-y-8 border-gray-200 mt-8">

      <div className="mb-6">
        <Label htmlFor="hearingTestType" className="text-base">Hearing Test Type:</Label>
        <select
          id="hearingTestType"
          name="hearingTestType"
          value={hearingTestType}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 p-2 mt-2"
        >
          <option value="">Select Test Type</option>
          <option value="Full Threshold Testing">Full Threshold Testing</option>
          <option value="Hearing Screened">Hearing Screened</option>
          <option value="Hearing Not Tested">Hearing Not Tested</option>
          <option value="Hearing Not Tested (Wearing Hearing Aids)">Hearing Not Tested (Wearing Hearing Aids)</option>
        </select>
        {errors?.researchData?.hearingTestType && (
          <p className="text-red-500 text-sm mt-1">{errors.researchData.hearingTestType}</p>
        )}
      </div>

      {hearingTestType === 'Hearing Screened' && (
        <div className="mb-6">
          <Label htmlFor="hearingScreenResult" className="text-base">Hearing Screen Result:</Label>
          <select
            id="hearingScreenResult"
            name="hearingScreenResult"
            value={formData.researchData?.hearingScreenResult || ''}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2 mt-2"
          >
            <option value="">Select Result</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
          {errors?.researchData?.hearingScreenResult && (
            <p className="text-red-500 text-sm mt-1">{errors.researchData.hearingScreenResult}</p>
          )}
        </div>
      )}

      {hearingTestType === 'Full Threshold Testing' && (
        <div className="space-y-8">
          <p className="text-base text-gray-600 italic">
            Enter hearing thresholds in dB HL. Leave blank if not tested.
          </p>

          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h4 className="text-lg font-medium mb-4">Right Ear</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[250, 500, 1000, 2000, 4000, 8000].map(freq => (
                <div key={`right-${freq}`}>
                  <Label htmlFor={`threshold_${freq}_rightEar`} className="font-medium">{freq} Hz</Label>
                  <Input
                    id={`threshold_${freq}_rightEar`}
                    name={`threshold_${freq}_rightEar`}
                    placeholder="dB HL"
                    type="number"
                    min="-10"
                    max="120"
                    value={getThresholdValue(freq, 'rightEar')}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h4 className="text-lg font-medium mb-4">Left Ear</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[250, 500, 1000, 2000, 4000, 8000].map(freq => (
                <div key={`left-${freq}`}>
                  <Label htmlFor={`threshold_${freq}_leftEar`} className="font-medium">{freq} Hz</Label>
                  <Input
                    id={`threshold_${freq}_leftEar`}
                    name={`threshold_${freq}_leftEar`}
                    placeholder="dB HL"
                    type="number"
                    min="-10"
                    max="120"
                    value={getThresholdValue(freq, 'leftEar')}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Label htmlFor="notes" className="text-base">Notes:</Label>
        <textarea
          id="notes"
          name="notes"
          value={formData.researchData?.notes || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            researchData: {
              ...prev.researchData,
              notes: e.target.value
            }
          }))}
          className="w-full rounded-md border border-gray-300 p-3 mt-2"
          rows={4}
          placeholder="Add any additional notes about the hearing assessment"
        />
      </div>
    </div>
  );
};

export default HearingAssessment;