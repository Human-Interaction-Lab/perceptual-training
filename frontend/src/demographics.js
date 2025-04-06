import React, { useState, useEffect } from 'react';
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";
import { ArrowLeft, CheckCircle } from 'lucide-react';
import HearingAssessment from "./hearingAssessment";
import config from './config';

const SelectField = ({ label, name, value, onChange, options, error }) => (
  <div className="space-y-2 mb-6">
    <Label htmlFor={name} className="text-base">{label}</Label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full rounded-md border ${error ? 'border-red-500' : 'border-gray-300'} p-2 mt-1`}
    >
      <option value="">Select an option</option>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

const RadioGroup = ({ label, name, value, onChange, options, error }) => (
  <div className="space-y-3 mb-6">
    <Label className="text-base">{label}</Label>
    <div className="space-y-3 pl-1">
      {options.map(option => (
        <div key={option} className="flex items-center space-x-3">
          <input
            type="radio"
            id={`${name}-${option}`}
            name={name}
            value={option}
            checked={value === option}
            onChange={(e) => onChange(e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value)}
            className="form-radio h-4 w-4 text-[#406368]"
          />
          <Label htmlFor={`${name}-${option}`} className="font-normal">{option}</Label>
        </div>
      ))}
    </div>
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
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
    communicationType: '',
    formCompletedBy: 'Research Personnel', // Default value
    researchData: {
      hearingTestType: '',
      hearingScreenResult: '',
      hearingThresholds: [],
      notes: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isResearchPersonnel, setIsResearchPersonnel] = useState(true); // Set to true since default is 'Research Personnel'

  useEffect(() => {
    const checkExistingDemographics = async () => {
      try {
        const token = localStorage.getItem('token');
        // Get userId from somewhere - could be stored in localStorage during login
        const userId = localStorage.getItem('userId');
        
        // Only try to fetch demographics if we have both token and userId
        if (!token || !userId) {
          console.warn('Missing token or userId, skipping demographics fetch');
          return;
        }

        console.log(`Checking for existing demographics for user: ${userId}`);
        
        try {
          const response = await fetch(`${config.API_BASE_URL}/api/demographics/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            // Pre-fill form with existing data
            if (data) {
              console.log('Found existing demographics data, pre-filling form');
              // Format date for input field
              if (data.dateOfBirth) {
                const date = new Date(data.dateOfBirth);
                data.dateOfBirth = date.toISOString().split('T')[0];
              }
              setFormData(data);
              setIsResearchPersonnel(data.formCompletedBy === 'Research Personnel');
            }
          } else if (response.status === 404) {
            console.log('No existing demographics found, using default form');
          } else {
            console.warn(`Unexpected response from demographics API: ${response.status}`);
          }
        } catch (fetchError) {
          // Handle fetch errors gracefully
          console.warn('Error fetching demographics, continuing with empty form:', fetchError);
        }
      } catch (error) {
        console.error('Error in demographics check:', error);
      }
    };

    checkExistingDemographics();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Basic required field validation
    const requiredFields = [
      'dateOfBirth', 'ethnicity', 'race', 'sexAssignedAtBirth',
      'isEnglishPrimary', 'cognitiveImpairment', 'hearingLoss',
      'hearingAids', 'relationshipToPartner', 'communicationFrequency',
      'communicationType', 'formCompletedBy'
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
      }
    });

    // Special validation for relationshipOther
    if (formData.relationshipToPartner === 'Other' && !formData.relationshipOther) {
      newErrors.relationshipOther = 'Please specify the relationship';
    }

    // Date validation
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        newErrors.dateOfBirth = 'Please enter a valid date';
      } else if (dob > new Date()) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (!formData.researchData?.hearingTestType) {
      newErrors.researchData = {
        ...newErrors.researchData,
        hearingTestType: 'Hearing test type is required'
      };
    }

    if (formData.researchData?.hearingTestType === 'Hearing Screened' &&
      !formData.researchData?.hearingScreenResult) {
      newErrors.researchData = {
        ...newErrors.researchData,
        hearingScreenResult: 'Hearing screen result is required'
      };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 &&
      (!newErrors.researchData || Object.keys(newErrors.researchData).length === 0);
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

      // Toggle research personnel interface
      if (name === 'formCompletedBy') {
        setIsResearchPersonnel(value === 'Research Personnel');
      }
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

    setSubmitting(true);

    try {
      if (!validateForm()) {
        setSubmitting(false);
        return;
      }

      // Format the data to match schema
      const formattedData = {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth), // Convert to Date object
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/api/demographics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle case where demographics already exist
        if (response.status === 400 && data.error && data.error.includes("Demographics already exist")) {
          console.log("Demographics already exist, proceeding as if submission was successful");
          
          // No preloading during demographics anymore - completely separate
          console.log("Completely separating demographics from pretest - no preloading here");
          
          // Immediately proceed to the next step
          onSubmit();
          return;
        }
        
        throw new Error(data.error || 'Failed to submit form');
      }
      
      // No longer preload files at all during demographics submission
      console.log("Demographics submitted successfully - no longer preloading files here");
      
      // Just proceed immediately
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
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg !border-0">
          <CardHeader className="bg-[#406368] text-white pb-6">
            <h2 className="text-2xl font-bold text-white">Background Information</h2>
            <p className="text-white text-opacity-90 mt-2">Please complete all fields to continue with the study</p>
            {errors.general && (
              <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                {errors.general}
              </div>
            )}
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-2 pt-6">
              {/* Form Completion Type */}
              <div className="bg-gray-50 p-5 rounded-lg mb-8">
                <RadioGroup
                  label="Form Completed By"
                  name="formCompletedBy"
                  value={formData.formCompletedBy}
                  onChange={(value) => {
                    handleRadioChange('formCompletedBy', value);
                    setIsResearchPersonnel(value === 'Research Personnel');
                  }}
                  options={['Participant', 'Research Personnel']}
                  error={errors.formCompletedBy}
                />
              </div>

              {/* Basic Demographics Section */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-6">Basic Information</h3>

                <div className="mb-6">
                  <Label htmlFor="dateOfBirth" className="text-base">Date of Birth</Label>
                  <Input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className={`mt-1 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
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
              </div>

              {/* Language and Health Section */}
              <div className="border-t border-gray-200 pt-8 mb-8">
                <h3 className="text-xl font-semibold mb-6">Language & Health</h3>

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

              </div>

              {/* Relationship Section */}
              <div className="border-t border-gray-200 pt-8 mb-8">
                <h3 className="text-xl font-semibold mb-6">Communication</h3>

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
                  <div className="mb-6">
                    <Label htmlFor="relationshipOther" className="text-base">Please specify relationship</Label>
                    <Input
                      type="text"
                      id="relationshipOther"
                      name="relationshipOther"
                      value={formData.relationshipOther || ''}
                      onChange={handleChange}
                      className={`mt-1 ${errors.relationshipOther ? 'border-red-500' : ''}`}
                    />
                    {errors.relationshipOther && (
                      <p className="text-red-500 text-sm mt-1">{errors.relationshipOther}</p>
                    )}
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
              </div>

              {/* Hearing Assessment Section */}
              <div className="border-t border-gray-200 pt-8 mb-8">
                <h3 className="text-xl font-semibold mb-6">Hearing</h3>
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
                  error={errors.hearingAids}
                />

                <HearingAssessment
                  formData={formData}
                  setFormData={setFormData}
                  errors={errors}
                />
              </div>
            </CardContent>

            <CardFooter className="pt-6 !border-0">
              <div className="w-full flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#406368] hover:bg-[#6c8376] px-8"
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
    </div>
  );
};

export default DemographicsForm;