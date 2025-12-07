export const getAvatarSrc = (user) => {
  if (user?.avatar) return user.avatar;
  if (user?.gender === "female") {
    return "/default-avatars/profile-female-svgrepo-com.svg";
  }
  return "/default-avatars/profile-male-svgrepo-com.svg";
};
