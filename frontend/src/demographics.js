import React, { useState, useEffect } from 'react';
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { ArrowLeft, CheckCircle } from 'lucide-react';

const SelectField = ({ label, name, value, onChange, options, error }) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full rounded-md border ${error ? 'border-red-500' : 'border-gray-300'} p-2`}
    >
      <option value="">Select an option</option>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

const RadioGroup = ({ label, name, value, onChange, options, error }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="space-y-2">
      {options.map(option => (
        <div key={option} className="flex items-center space-x-2">
          <input
            type="radio"
            id={`${name}-${option}`}
            name={name}
            value={option}
            checked={value === option}
            onChange={(e) => onChange(e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value)}
            className="form-radio"
          />
          <Label htmlFor={`${name}-${option}`}>{option}</Label>
        </div>
      ))}
    </div>
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);


const DemographicsForm = ({ onSubmit, onBack }) => {
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    ethnicity: '',
    race: '',
    sexAssignedAtBirth: '',
    isEnglishPrimary: '',
    cognitiveImpairment: '',
    hearingLoss: '',
    hearingAids: '',
    relationshipToPartner: '',
    relationshipOther: '',
    communicationFrequency: '',
    communicationType: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkExistingDemographics = async () => {
      try {
        const token = localStorage.getItem('token');
        // Get userId from somewhere - could be stored in localStorage during login
        const userId = localStorage.getItem('userId');

        const response = await fetch(`http://localhost:3000/api/demographics/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Demographics exist
          setErrors({
            general: 'Demographics already submitted'
          });
        }
      } catch (error) {
        console.error('Error checking demographics:', error);
      }
    };

    checkExistingDemographics();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Basic required field validation
    Object.entries(formData).forEach(([key, value]) => {
      if (!value && key !== 'relationshipOther') {
        newErrors[key] = `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
      }
    });

    // Special validation for relationshipOther
    if (formData.relationshipToPartner === 'Other' && !formData.relationshipOther) {
      newErrors.relationshipOther = 'Please specify the relationship';
    }

    // Date validation
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (dob > new Date()) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleRadioChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value === 'Yes' ? 'Yes' : value === 'No' ? 'No' : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      if (!validateForm()) {
        setSubmitting(false);
        return;
      }

      // Format the data to match schema
      const formattedData = {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth), // Convert to Date object
        formCompletedBy: 'Participant',
        // Add any missing required fields with defaults
        researchData: {
          hearingScreeningCompleted: false,
          hearingThresholds: [],
          notes: ''
        }
      };

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/demographics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      onSubmit();
    } catch (error) {
      console.error('Error submitting demographics:', error);
      setErrors({
        general: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center mb-6">
              <div className="justify-start">
                <h2 className="text-2xl font-bold text-gray-900">Demographics Questionnaire</h2>
                <p className="text-gray-600 mt-1">Please respond to each question below.</p>
              </div>
            </div>

            {errors.general && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {errors.general}
              </div>
            )}
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Basic Demographics */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.dateOfBirth ? 'border-red-500' : ''}
                />
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>
                )}
              </div>

              <SelectField
                label="Ethnicity"
                name="ethnicity"
                value={formData.ethnicity}
                onChange={handleChange}
                options={[
                  'Hispanic or Latino',
                  'Not Hispanic or Latino',
                  'Prefer not to answer'
                ]}
                error={errors.ethnicity}
              />

              <SelectField
                label="Race"
                name="race"
                value={formData.race}
                onChange={handleChange}
                options={[
                  'American Indian or Alaska Native',
                  'Asian',
                  'Black or African American',
                  'Native Hawaiian or Other Pacific Islander',
                  'White',
                  'Multiple races',
                  'Prefer not to answer'
                ]}
                error={errors.race}
              />

              <SelectField
                label="Sex Assigned at Birth"
                name="sexAssignedAtBirth"
                value={formData.sexAssignedAtBirth}
                onChange={handleChange}
                options={[
                  'Male',
                  'Female',
                  'Prefer not to answer'
                ]}
                error={errors.sexAssignedAtBirth}
              />

              {/* Language and Health Section */}
              <RadioGroup
                label="Is English your primary language?"
                name="isEnglishPrimary"
                value={formData.isEnglishPrimary}
                onChange={(value) => handleRadioChange('isEnglishPrimary', value)}
                options={['Yes', 'No', 'Unknown']}
                error={errors.isEnglishPrimary}
              />

              <SelectField
                label="Do you have any cognitive impairment?"
                name="cognitiveImpairment"
                value={formData.cognitiveImpairment}
                onChange={handleChange}
                options={['Yes', 'No', 'Unknown']}
                error={errors.cognitiveImpairment}
              />

              <SelectField
                label="Do you have hearing loss?"
                name="hearingLoss"
                value={formData.hearingLoss}
                onChange={handleChange}
                options={['Yes', 'No', 'Unknown']}
                error={errors.hearingLoss}
              />

              <RadioGroup
                label="Do you use hearing aids?"
                name="hearingAids"
                value={formData.hearingAids}
                onChange={(value) => handleRadioChange('hearingAids', value)}
                options={['Yes', 'No', 'Unknown']}
              />

              {/* Relationship Section */}
              <SelectField
                label="What is your relationship to your communication partner?"
                name="relationshipToPartner"
                value={formData.relationshipToPartner}
                onChange={handleChange}
                options={[
                  'Spouse/Partner',
                  'Child',
                  'Sibling',
                  'Friend',
                  'Other'
                ]}
                error={errors.relationshipToPartner}
              />

              {formData.relationshipToPartner === 'Other' && (
                <div>
                  <Label htmlFor="relationshipOther">Please specify relationship</Label>
                  <Input
                    type="text"
                    id="relationshipOther"
                    name="relationshipOther"
                    value={formData.relationshipOther}
                    onChange={handleChange}
                    className={errors.relationshipOther ? 'border-red-500' : ''}
                  />
                </div>
              )}

              <SelectField
                label="How often do you communicate with your partner?"
                name="communicationFrequency"
                value={formData.communicationFrequency}
                onChange={handleChange}
                options={[
                  'Daily',
                  'Several Days Per Week',
                  'Weekly',
                  'Monthly',
                  'Less than Monthly'
                ]}
                error={errors.communicationFrequency}
              />

              <SelectField
                label="What is your primary mode of communication?"
                name="communicationType"
                value={formData.communicationType}
                onChange={handleChange}
                options={[
                  'Face to face',
                  'Phone (audio only)',
                  'Video chat'
                ]}
                error={errors.communicationType}
              />

            </CardContent>

            <CardFooter className="flex justify-between">
              <div className="w-full flex justify-end space-x-4">
                <Button
                  variant="ghost"
                  disabled={submitting}
                  onClick={onBack}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-8"
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">●</span>
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit
                    </span>
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div >
  );
};

export default DemographicsForm;