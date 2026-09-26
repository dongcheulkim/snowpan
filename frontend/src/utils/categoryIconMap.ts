// 카테고리 → 아이콘 컴포넌트 매핑 (홈 퀵메뉴). 컴포넌트 파일과 분리해 HMR(react-refresh) 규칙을 지킨다.
import { SkiShopIcon, OverseasIcon, MaintenanceIcon, SecondHandIcon, RentalIcon, LessonIcon, AccommodationIcon, CommunityIcon, ScheduleIcon, LivecamIcon } from '../components/CategoryIcons';

export const categoryIcons = {
  skishop: SkiShopIcon,
  overseas: OverseasIcon,
  repair: MaintenanceIcon,
  used: SecondHandIcon,
  rental: RentalIcon,
  lesson: LessonIcon,
  accommodation: AccommodationIcon,
  community: CommunityIcon,
  competitions: ScheduleIcon,
  webcam: LivecamIcon,
};
