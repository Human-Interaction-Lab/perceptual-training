import React, { useState } from 'react';
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "./components/ui/card";


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

  const validateForm = () => {
    const newErrors = {};

    // Required field validation
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.ethnicity) newErrors.ethnicity = 'Ethnicity is required';
    if (!formData.race) newErrors.race = 'Race is required';
    if (!formData.sexAssignedAtBirth) newErrors.sexAssignedAtBirth = 'Sex assigned at birth is required';
    if (!formData.isEnglishPrimary) newErrors.isEnglishPrimary = 'English primary language is required';
    if (!formData.cognitiveImpairment) newErrors.cognitiveImpairment = 'Cognitive impairment status is required';
    if (!formData.hearingLoss) newErrors.hearingLoss = 'Hearing loss status is required';
    if (!formData.hearingAids) newErrors.hearingAids = 'Hearing aids status is required';
    if (!formData.relationshipToPartner) newErrors.relationshipToPartner = 'Relationship to partner is required';
    if (!formData.communicationFrequency) newErrors.communicationFrequency = 'Communication frequency is required';
    if (!formData.communicationType) newErrors.communicationType = 'Communication type is required';

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
    e.preventDefault(); // Prevent form submission
    if (submitting) return;

    setSubmitting(true);
    console.log('Form submitted', formData); // Debug log

    try {
      // Validate form
      if (!validateForm()) {
        setSubmitting(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/demographics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          formCompletedBy: 'Participant'
        })
      });

      if (response.ok) {
        // Call the onSubmit callback
        onSubmit();
      } else {
        const data = await response.json();
        setErrors(data.errors.general);
      }
    } catch (error) {
      console.error('Error submitting demographics:', error);
      setErrors({ general: 'Failed to submit form. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900">Demographics Questionnaire</h2>
            <p className="text-gray-600">Please complete all fields to continue with the study</p>
            {errors.general && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {errors.general}
              </div>
            )}
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Basic Demographics */}
              <div>
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
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div >
  );
};

export default DemographicsForm;