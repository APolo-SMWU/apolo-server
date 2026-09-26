import type { ProfileData, ProfileField } from "../types/portfolio";

type UserProfile = {
  role: string | null;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  tel: string | null;
  university: string | null;
  department: string | null;
  major: string | null;
  github: string | null;
};

const textField = (
  kind: Extract<ProfileField["kind"], "tel" | "company" | "university" | "department" | "major">,
  label: string,
  value: string | null,
): ProfileField | null => {
  if (!value?.trim()) return null;
  return { kind, label, value: value.trim() };
};

const validGithubField = (github: string | null): ProfileField | null => {
  if (!github || !/^https?:\/\//.test(github)) return null;
  return { kind: "github", label: "GitHub", value: github };
};

export const mapUserProfileToPortfolioProfile = (
  user: UserProfile,
  generatedProfile: ProfileData,
): ProfileData => {
  const fields: ProfileField[] = [
    { kind: "email", label: "E-mail", value: user.email },
    { kind: "phone", label: "Mobile", value: user.phone ?? "" },
  ];

  const role = user.role?.toLowerCase();
  if (role === "professional") {
    const company = textField("company", "Company", user.company);
    const tel = textField("tel", "Tel", user.tel);
    if (company) fields.push(company);
    if (tel) fields.push(tel);
  } else if (role === "professor") {
    const university = textField("university", "University", user.university);
    const department = textField("department", "Department", user.department);
    const tel = textField("tel", "Tel", user.tel);
    if (university) fields.push(university);
    if (department) fields.push(department);
    if (tel) fields.push(tel);
  } else if (role === "student") {
    const university = textField("university", "University", user.university);
    const major = textField("major", "Major", user.major);
    if (university) fields.push(university);
    if (major) fields.push(major);
  }

  const github = validGithubField(user.github);
  if (github) fields.push(github);

  return {
    name: user.name,
    title:
      generatedProfile.title ||
      user.jobTitle ||
      user.major ||
      user.department ||
      user.role ||
      "Professional",
    avatarUrl: generatedProfile.avatarUrl,
    fields,
  };
};
