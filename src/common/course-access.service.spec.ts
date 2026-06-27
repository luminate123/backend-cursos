import { CourseAccessService } from './course-access.service';

// redactLessons is the security-critical bit: what a non-enrolled viewer may see.
describe('CourseAccessService.redactLessons', () => {
  const svc = new CourseAccessService({} as any);

  const makeLessons = () => [
    { isFree: true, youtubeUrl: 'y1', youtubeVideoId: 'v1', resources: [{ url: 'r' }], notes: 'n' },
    { isFree: false, youtubeUrl: 'y2', youtubeVideoId: 'v2', resources: [{ url: 'r' }], notes: 'n' },
  ];

  it('keeps everything when access is granted', () => {
    const lessons = makeLessons();
    svc.redactLessons(lessons, true);
    expect(lessons[1].youtubeUrl).toBe('y2');
    expect(lessons[1].resources).not.toBeNull();
  });

  it('strips downloads + notes always, and video for non-free lessons', () => {
    const lessons = makeLessons();
    svc.redactLessons(lessons, false);

    // free lesson: video kept (preview), but downloads + notes gone
    expect(lessons[0].youtubeUrl).toBe('y1');
    expect(lessons[0].resources).toBeNull();
    expect(lessons[0].notes).toBeNull();

    // locked lesson: everything protected gone
    expect(lessons[1].youtubeUrl).toBeNull();
    expect(lessons[1].youtubeVideoId).toBeNull();
    expect(lessons[1].resources).toBeNull();
    expect(lessons[1].notes).toBeNull();
  });
});
