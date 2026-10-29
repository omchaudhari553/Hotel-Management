import React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

export const SignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryIndustry = (
    searchParams.get('industry') ||
    location.state?.industry ||
    localStorage.getItem('ajalkar_industry') ||
    'HOTEL'
  ).toUpperCase();

  React.useEffect(() => {
    navigate(`/get-started?step=1&industry=${queryIndustry}`, { replace: true });
  }, [navigate, queryIndustry]);

  return null;
};
