import { Forum } from "features/forum/Forum";
import { Layout } from "features/layout";
import { useState } from "react";
import { isMobile } from "react-device-detect";

const ForumPage = () => {
  const [isLogin, setIsLogin] = useState(0);
  return (
    <Layout pageTitle="Forum" isLogin={isLogin} p={isMobile ? 5 : 5}>
      <Forum isLogin={isLogin} setIsLogin={setIsLogin} />
    </Layout>
  );
};

export default ForumPage;
